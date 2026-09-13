import { useEffect, useRef, useState } from 'react';
import type { ClientMessage, ServerMessage } from '../../src/framework.js';
import type { PlayerView } from '../../src/games/liars-dice/engine.js';
import ConnectScreen from './screens/ConnectScreen.js';
import LobbyScreen from './screens/LobbyScreen.js';
import { GAME_COMPONENTS, GAME_NAMES } from './games/index.js';
import type { AppState } from './types.js';

/** Same-origin websocket: the page and the game server are one process. */
function serverWsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}`;
}

const initial: AppState = {
  screen: 'connect',
  tablePhase: 'lobby',
  games: [],
  gameId: 'liars-dice',
  playerId: '',
  hostId: null,
  lobbyPlayers: [],
  names: {},
  view: null,
  notice: '',
};

export default function App() {
  const [state, setState] = useState<AppState>(initial);
  const wsRef = useRef<WebSocket | null>(null);
  const isHost = state.hostId !== null && state.hostId === state.playerId;

  // Notices clear themselves.
  useEffect(() => {
    if (!state.notice) return;
    const t = setTimeout(() => setState((s) => ({ ...s, notice: '' })), 4000);
    return () => clearTimeout(t);
  }, [state.notice]);

  // Don't leave a dangling socket.
  useEffect(() => () => wsRef.current?.close(), []);

  const send = (msg: ClientMessage) => wsRef.current?.send(JSON.stringify(msg));

  const onMessage = (msg: ServerMessage) => {
    setState((s) => {
      switch (msg.kind) {
        case 'welcome':
          return { ...s, playerId: msg.playerId };
        case 'lobby': {
          const names: Record<string, string> = {};
          for (const p of msg.players) names[p.id] = p.name;
          return {
            ...s,
            games: msg.games,
            gameId: msg.gameId,
            hostId: msg.hostId,
            lobbyPlayers: msg.players,
            tablePhase: msg.phase,
            names,
            // Don't yank the game-over screen away when the lobby reforms.
            screen: s.screen === 'game' ? 'game' : 'lobby',
          };
        }
        case 'gameView':
          return { ...s, view: msg.view as PlayerView, screen: 'game' };
        case 'error':
          return { ...s, notice: msg.message };
      }
    });
  };

  const join = (playerName: string) => {
    if (!playerName.trim()) {
      setState((s) => ({ ...s, notice: 'Enter a name first.' }));
      return;
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      send({ kind: 'hello', playerName });
      return;
    }
    setState((s) => ({ ...s, notice: 'Connecting…' }));
    const ws = new WebSocket(serverWsUrl());
    wsRef.current = ws;
    ws.onopen = () => {
      setState((s) => ({ ...s, notice: '' }));
      send({ kind: 'hello', playerName });
    };
    ws.onmessage = (e) => onMessage(JSON.parse(e.data as string) as ServerMessage);
    ws.onclose = () => {
      wsRef.current = null;
      setState({ ...initial, notice: 'Disconnected from the server.' });
    };
    ws.onerror = () => {
      wsRef.current = null;
      setState((s) => ({ ...s, notice: 'Could not reach the server.' }));
    };
  };

  const backToLobby = () => setState((s) => ({ ...s, view: null, screen: 'lobby' }));
  const paused = state.tablePhase === 'paused';

  const GameScreen = GAME_COMPONENTS[state.gameId];

  return (
    <div id="app">
      {state.notice && <div className="notice">{state.notice}</div>}

      {state.screen === 'connect' && <ConnectScreen onJoin={join} />}

      {state.screen === 'lobby' && (
        <LobbyScreen
          games={state.games}
          gameId={state.gameId}
          gameName={GAME_NAMES[state.gameId] ?? state.gameId}
          players={state.lobbyPlayers}
          playerId={state.playerId}
          isHost={isHost}
          tablePhase={state.tablePhase}
          onSelectGame={(gameId) => send({ kind: 'selectGame', gameId })}
          onStart={() => send({ kind: 'startGame' })}
          onToLobby={() => send({ kind: 'toLobby' })}
        />
      )}

      {state.screen === 'game' && state.view && GameScreen && (
        <GameScreen
          view={state.view}
          playerId={state.playerId}
          isHost={isHost}
          paused={paused}
          names={state.names}
          sendAction={(action) => send({ kind: 'action', action })}
          onBackToLobby={backToLobby}
          onToLobby={() => send({ kind: 'toLobby' })}
        />
      )}
    </div>
  );
}
