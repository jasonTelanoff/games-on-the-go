/**
 * index.ts — HTTP + websocket server. One Node process serves the client
 * page AND the game server on a single port, so players just open the
 * server's address and everything is same-origin. No rooms, no codes:
 * one table, whoever connects joins. The first to join is the host.
 */
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { networkInterfaces } from 'os';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { ClientMessage, GameEvent, ServerMessage } from '../framework.js';
import { TableError, TableManager, gameList } from './table.js';
import { AVATARS } from '../avatars.js';
import { logger } from './log.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(here, '../../public');

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

async function serveStatic(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    let urlPath = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const file = path.normalize(path.join(PUBLIC_DIR, urlPath));
    if (!file.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}

function lanUrls(port: number): string[] {
  const urls: string[] = [];
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const i of ifaces ?? []) {
      if (i.family === 'IPv4' && !i.internal) {
        urls.push(`http://${i.address}:${port}`);
      }
    }
  }
  return urls;
}

interface Conn {
  ws: WebSocket;
  playerId: string | null;
}

export interface RunningServer {
  port: number;
  close: () => Promise<void>;
}

export async function startServer(port: number): Promise<RunningServer> {
  const mgr = new TableManager();
  const conns = new Set<Conn>();

  // ---- logging helpers ----
  const glyphOf = (avatarId: string): string =>
    AVATARS.find((a) => a.id === avatarId)?.glyph ?? '';
  const nameOf = (id: string): string =>
    mgr.getTable().players.find((p) => p.id === id)?.name ?? '???';
  const connectedCount = (): number =>
    mgr.getTable().players.filter((p) => p.connected).length;

  /** Human-readable narration for known game events; null when unknown. */
  function describeEvent(e: GameEvent): string | null {
    switch (e.type) {
      case 'bidPlaced': {
        const b = e.bid as { playerId: string; quantity: number; face: number } | undefined;
        return b ? `🎲 ${nameOf(b.playerId)} bids ${b.quantity} × ${b.face}s` : null;
      }
      case 'challengeResolved': {
        const r = e.result as
          | {
              kind: string;
              challengerId: string;
              bidStood: boolean;
              loserIds: string[];
              actualCount: number;
              bid: { quantity: number; face: number };
            }
          | undefined;
        if (!r) return null;
        const losers = r.loserIds.map(nameOf).join(', ');
        if (r.kind === 'exact') {
          return r.bidStood
            ? `🎯 ${nameOf(r.challengerId)} called it exactly (${r.actualCount} × ${r.bid.face}s) — ${losers} lose a die`
            : `🎯 ${nameOf(r.challengerId)} missed exact (${r.actualCount} × ${r.bid.face}s vs bid ${r.bid.quantity}) — loses a die`;
        }
        return r.bidStood
          ? `🛡 bid stood (${r.actualCount} × ${r.bid.face}s) — ${losers} loses a die`
          : `⚔ only ${r.actualCount} × ${r.bid.face}s — ${losers} was lying, loses a die`;
      }
      case 'playerEliminated':
        return typeof e.playerId === 'string' ? `💀 ${nameOf(e.playerId)} is out` : null;
      case 'gameOver':
        return typeof e.winnerId === 'string' ? `🏆 ${nameOf(e.winnerId)} wins!` : null;
      default:
        return null;
    }
  }

  const httpServer = createServer((req, res) => {
    serveStatic(req, res).catch(() => {
      res.writeHead(500);
      res.end('server error');
    });
  });
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const send = (c: Conn, msg: ServerMessage): void => {
    if (c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(JSON.stringify(msg));
    }
  };

  const broadcastLobby = (): void => {
    const t = mgr.getTable();
    const msg: ServerMessage = {
      kind: 'lobby',
      games: gameList(),
      gameId: t.gameId,
      hostId: t.hostId,
      players: t.players.map((p) => ({ id: p.id, name: p.name, avatarId: p.avatarId, connected: p.connected })),
      phase: t.phase,
    };
    for (const c of conns) send(c, msg);
  };

  /** Each player in the game gets their own view — hidden info stays hidden. */
  const broadcastViews = (): void => {
    const t = mgr.getTable();
    for (const c of conns) {
      if (!c.playerId || !mgr.inGame(c.playerId)) continue;
      send(c, {
        kind: 'gameView',
        view: mgr.viewFor(c.playerId),
        events: t.lastEvents,
      });
    }
  };

  wss.on('connection', (ws: WebSocket) => {
    const conn: Conn = { ws, playerId: null };
    conns.add(conn);
    logger.debug('ws: new connection');

    ws.on('message', (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        send(conn, { kind: 'error', message: 'Could not parse that message' });
        return;
      }
      try {
        switch (msg.kind) {
          case 'hello': {
            const rejoining = mgr.isRejoin(msg.playerName);
            const player = mgr.join(msg.playerName, msg.avatarId);
            conn.playerId = player.id;
            const crown = mgr.isHost(player.id) ? ' 👑' : '';
            logger.info(
              `${rejoining ? '↩' : '→'} ${player.name} ${glyphOf(player.avatarId)}${crown} ` +
                `${rejoining ? 'reconnected' : 'joined'} (${connectedCount()} connected)`,
            );
            send(conn, { kind: 'welcome', playerId: player.id, isHost: mgr.isHost(player.id) });
            const resumed = mgr.tryResume();
            if (resumed) logger.info('▶ all players back — game resumed');
            broadcastLobby();
            if (resumed) broadcastViews();
            break;
          }
          case 'selectGame': {
            if (!conn.playerId) throw new TableError('Say hello first');
            mgr.selectGame(msg.gameId, conn.playerId);
            const g = gameList().find((g) => g.id === msg.gameId);
            logger.debug(`${nameOf(conn.playerId)} selected ${g?.name ?? msg.gameId}`);
            broadcastLobby();
            break;
          }
          case 'startGame': {
            if (!conn.playerId) throw new TableError('Say hello first');
            mgr.startGame(conn.playerId);
            const t = mgr.getTable();
            const g = gameList().find((g) => g.id === t.gameId);
            logger.info(
              `▶ ${nameOf(conn.playerId)} started ${g?.name ?? t.gameId} — ` +
                `${t.gamePlayerIds.length} players: ${t.gamePlayerIds.map(nameOf).join(', ')}`,
            );
            broadcastViews();
            broadcastLobby();
            break;
          }
          case 'toLobby': {
            if (!conn.playerId) throw new TableError('Say hello first');
            mgr.toLobby(conn.playerId);
            logger.info(`↩ ${nameOf(conn.playerId)} sent everyone back to the lobby`);
            broadcastLobby();
            break;
          }
          case 'action': {
            if (!conn.playerId) throw new TableError('Say hello first');
            mgr.applyAction(conn.playerId, msg.action);
            logger.debug(`← ${nameOf(conn.playerId)}: ${JSON.stringify(msg.action)}`);
            for (const e of mgr.getTable().lastEvents) {
              const text = describeEvent(e);
              if (text) logger.info(text);
              else logger.debug(`event: ${JSON.stringify(e)}`);
            }
            broadcastViews();
            if (mgr.gameEnded()) {
              // Final views (with the winner) are already out; now lobby up.
              mgr.resetToLobby();
              broadcastLobby();
            }
            break;
          }
          default:
            send(conn, { kind: 'error', message: 'Unknown message' });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Something broke';
        const actor = conn.playerId
          ? nameOf(conn.playerId)
          : msg.kind === 'hello' && msg.playerName.trim()
            ? `?${msg.playerName.trim()}`
            : '(unknown)';
        logger.warn(`✖ ${actor}: ${message}`);
        send(conn, { kind: 'error', message });
      }
    });

    ws.on('close', () => {
      conns.delete(conn);
      if (!conn.playerId) return;
      const name = nameOf(conn.playerId);
      const wasHost = mgr.isHost(conn.playerId);
      const paused = mgr.disconnect(conn.playerId);
      logger.info(`← ${name} disconnected`);
      if (paused) {
        const t = mgr.getTable();
        const waiting = t.gamePlayerIds
          .filter((id) => !t.players.some((p) => p.id === id && p.connected))
          .map(nameOf)
          .join(', ');
        logger.info(`⏸ game paused — waiting on: ${waiting}`);
      }
      if (wasHost) {
        const nextHost = mgr.getTable().hostId;
        if (nextHost) logger.info(`👑 host → ${nameOf(nextHost)}`);
      }
      if (paused) {
        for (const c of conns) {
          send(c, { kind: 'error', message: 'A player disconnected — game paused.' });
        }
      }
      broadcastLobby();
    });
  });

  await new Promise<void>((resolve) => httpServer.listen(port, resolve));
  const address = httpServer.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;

  return {
    port: actualPort,
    close: () =>
      new Promise<void>((resolve, reject) => {
        // Drop any lingering clients first: wss.close() waits for all
        // connections to end, so without this shutdown hangs.
        for (const c of conns) c.ws.terminate();
        wss.close(() => {
          httpServer.close((err) => (err ? reject(err) : resolve()));
        });
      }),
  };
}

// Run directly: `node dist/server/index.js` (or `npm run serve`).
// Under `npm run dev:server`, point at the Vite dev server instead.
const invokedAs = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedAs && fileURLToPath(import.meta.url) === invokedAs) {
  const port = Number(process.env.PORT ?? 8080);
  const srv = await startServer(port);
  const lans = lanUrls(srv.port);
  if (process.env.npm_lifecycle_event === 'dev:server') {
    console.log('party-games server running (dev).');
    console.log('  The page is on the Vite server, NOT this port:');
    console.log('    http://localhost:5173        (play, hot reload)');
    console.log('    http://localhost:5173/?dev   (UI playground)');
    for (const u of lans) console.log(`    on your network: ${u.replace(`:${srv.port}`, ':5173')}`);
  } else {
    console.log('party-games server running!');
    console.log(`  On this device: http://localhost:${srv.port}`);
    if (lans.length > 0) {
      console.log('  On your network, players open:');
      for (const u of lans) console.log(`    ${u}`);
    } else {
      console.log('  No network address found — players can only join on this device.');
    }
    console.log('  Whoever joins first is the host.');
  }
}
