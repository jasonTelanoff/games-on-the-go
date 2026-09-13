/**
 * e2e.test.ts — boots the real HTTP+websocket server on an ephemeral port
 * and exercises the full table lifecycle over the actual wire protocol:
 * join, host start, a full game, mid-game disconnect -> pause, host
 * toLobby, rejoin-by-name, and host migration.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { ServerMessage } from '../framework.js';
import { startServer } from './index.js';

interface TestClient {
  ws: WebSocket;
  playerId: string;
  isHost: boolean;
  hostId: string | null;
  phase: string | null;
  players: { id: string; name: string; connected: boolean }[];
  view: any;
  errors: string[];
  closed: boolean;
}

async function connect(port: number): Promise<TestClient> {
  const c: TestClient = {
    ws: new WebSocket(`ws://localhost:${port}/ws`),
    playerId: '',
    isHost: false,
    hostId: null,
    phase: null,
    players: [],
    view: null,
    errors: [],
    closed: false,
  };
  c.ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString()) as ServerMessage;
    if (msg.kind === 'welcome') {
      c.playerId = msg.playerId;
      c.isHost = msg.isHost;
    } else if (msg.kind === 'lobby') {
      c.hostId = msg.hostId;
      c.phase = msg.phase;
      c.players = msg.players;
    } else if (msg.kind === 'gameView') {
      c.view = msg.view;
    } else if (msg.kind === 'error') {
      c.errors.push(msg.message);
    }
  });
  c.ws.on('close', () => (c.closed = true));
  await new Promise<void>((resolve, reject) => {
    c.ws.on('open', () => resolve());
    c.ws.on('error', reject);
  });
  return c;
}

const send = (c: TestClient, msg: unknown): void => {
  c.ws.send(JSON.stringify(msg));
};

async function waitFor(cond: () => boolean, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('timed out waiting for condition');
    await new Promise((r) => setTimeout(r, 25));
  }
}

/** Opener bids 1x2, next player always challenges — dice only decrease. */
async function playFullGame(a: TestClient, b: TestClient): Promise<string> {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    for (const c of [a, b]) {
      const v = c.view;
      if (!v || v.phase !== 'bidding' || v.turnPlayerId !== c.playerId) continue;
      send(
        c,
        v.currentBid
          ? { kind: 'action', action: { type: 'challenge' } }
          : { kind: 'action', action: { type: 'bid', quantity: 1, face: 2 } },
      );
    }
    if (a.view?.phase === 'gameOver' && b.view?.phase === 'gameOver') {
      return a.view.winnerId as string;
    }
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error('game did not finish');
}

test('full lifecycle: join, play, pause on disconnect, rejoin, host migration', async () => {
  const server = await startServer(0);
  try {
    const a = await connect(server.port);
    const b = await connect(server.port);

    // First to join is the host.
    send(a, { kind: 'hello', playerName: 'Ana' });
    await waitFor(() => a.playerId !== '');
    assert.ok(a.isHost);
    send(b, { kind: 'hello', playerName: 'Ben' });
    await waitFor(() => b.players.length === 2);
    assert.ok(!b.isHost);
    assert.equal(b.hostId, a.playerId);
    assert.equal(b.phase, 'lobby');

    // Host starts; play a full game; server lobbies up after game over.
    send(a, { kind: 'startGame' });
    await waitFor(() => a.view !== null && b.view !== null);
    const winner = await playFullGame(a, b);
    assert.ok([a.playerId, b.playerId].includes(winner));
    await waitFor(() => a.phase === 'lobby' && a.players.length === 2);

    // Second game: Ben disconnects mid-game -> paused.
    send(a, { kind: 'startGame' });
    await waitFor(() => b.view !== null && b.view.phase === 'bidding');
    b.ws.close();
    await waitFor(() => a.phase === 'paused');
    assert.ok(a.errors.some((e) => /paused/i.test(e)));
    const benRecord = a.players.find((p) => p.name === 'Ben')!;
    assert.ok(!benRecord.connected);

    // Ben rejoins with the same name -> seat reclaimed, game auto-resumes.
    const b2 = await connect(server.port);
    send(b2, { kind: 'hello', playerName: 'Ben' });
    await waitFor(() => b2.playerId !== '');
    assert.equal(b2.playerId, b.playerId);
    await waitFor(() => b2.players.find((p) => p.name === 'Ben')?.connected === true);
    await waitFor(() => b2.phase === 'playing' && b2.view?.phase === 'bidding');

    // Host ends it from the resumed game.
    send(a, { kind: 'toLobby' });
    await waitFor(() => a.phase === 'lobby');

    // Host (Ana) disconnects -> Ben becomes host and keeps it.
    a.ws.close();
    await waitFor(() => b2.hostId === b2.playerId);
    const a2 = await connect(server.port);
    send(a2, { kind: 'hello', playerName: 'Ana' });
    await waitFor(() => a2.playerId !== '');
    assert.equal(a2.playerId, a.playerId);
    await waitFor(() => a2.hostId === b2.playerId); // new host keeps it

    // The pause notice is expected; anything else is not.
    const unexpected = [a, b2, a2]
      .flatMap((c) => c.errors)
      .filter((e) => !/paused/i.test(e));
    assert.deepEqual(unexpected, []);

    b2.ws.close();
    a2.ws.close();
  } finally {
    await server.close();
  }
});

test('selectGame rejects unknown games with an error', async () => {
  const server = await startServer(0);
  try {
    const a = await connect(server.port);
    send(a, { kind: 'hello', playerName: 'Ana' });
    await waitFor(() => a.playerId !== '');
    send(a, { kind: 'selectGame', gameId: 'nope' });
    await waitFor(() => a.errors.length > 0);
    assert.match(a.errors[0], /unknown game/i);
    a.ws.close();
  } finally {
    await server.close();
  }
});
