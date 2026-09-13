/**
 * DevPlayground — the UI iteration screen. Only reachable in dev via ?dev.
 * Renders any registered game screen against hand-built mock views, with
 * a scenario switcher and an action log showing what the UI would send.
 * Nothing here touches the network.
 */
import { useState } from 'react';
import { GAME_COMPONENTS, GAME_NAMES } from '../games/index.js';
import LobbyScreen from '../screens/LobbyScreen.js';
import { DEV_NAMES, DEV_SCENARIOS } from './mocks.js';
import type { LobbyPlayer } from '../types.js';

const MOCK_PLAYERS: LobbyPlayer[] = [
  { id: 'p-ana', name: 'Ana', connected: true },
  { id: 'p-ben', name: 'Ben', connected: true },
  { id: 'p-cat', name: 'Cat', connected: false },
];

type Tab = { kind: 'game'; gameId: string } | { kind: 'lobby' };

export default function DevPlayground() {
  const gameIds = Object.keys(GAME_COMPONENTS);
  const [tab, setTab] = useState<Tab>({ kind: 'game', gameId: gameIds[0] });
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [lobbyHost, setLobbyHost] = useState(true);
  const [actions, setActions] = useState<string[]>([]);

  const log = (what: string, payload: unknown) =>
    setActions((a) => [`${what}: ${JSON.stringify(payload)}`, ...a].slice(0, 20));

  const tabs: { tab: Tab; label: string }[] = [
    ...gameIds.map((gameId) => ({ tab: { kind: 'game' as const, gameId }, label: GAME_NAMES[gameId] ?? gameId })),
    { tab: { kind: 'lobby' as const }, label: 'Lobby' },
  ];
  const isActive = (t: Tab) =>
    t.kind === tab.kind && (t.kind === 'lobby' || t.gameId === (tab as { gameId: string }).gameId);

  return (
    <div id="app">
      <div className="card">
        <div className="topbar">
          <span className="chip">dev playground</span>
          <span className="hint">?dev — no server needed</span>
        </div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
          {tabs.map(({ tab: t, label }) => (
            <button
              key={label}
              className={'btn small' + (isActive(t) ? ' primary' : '')}
              onClick={() => { setTab(t); setScenarioIdx(0); }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab.kind === 'game' && (
          <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {(DEV_SCENARIOS[tab.gameId] ?? []).map((s, i) => (
              <button
                key={s.label}
                className={'btn small' + (i === scenarioIdx ? ' primary' : '')}
                onClick={() => setScenarioIdx(i)}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {tab.kind === 'lobby' && (
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn small" onClick={() => setLobbyHost((h) => !h)}>
              {lobbyHost ? 'Viewing as host' : 'Viewing as player'} (toggle)
            </button>
          </div>
        )}

        {actions.length > 0 && (
          <>
            <div className="lbl" style={{ marginTop: 8 }}>Action log (what the UI would send)</div>
            <div className="hint" style={{ fontFamily: 'monospace' }}>
              {actions.map((a, i) => (
                <div key={i}>{a}</div>
              ))}
            </div>
            <button className="btn small" onClick={() => setActions([])}>Clear</button>
          </>
        )}
      </div>

      {tab.kind === 'game' &&
        (() => {
          const scenarios = DEV_SCENARIOS[tab.gameId] ?? [];
          const s = scenarios[scenarioIdx] ?? scenarios[0];
          const GameScreen = GAME_COMPONENTS[tab.gameId];
          if (!s || !GameScreen) return <p className="hint">No scenarios for this game yet.</p>;
          return (
            <GameScreen
              view={s.view}
              playerId={s.view.yourId}
              isHost={s.isHost}
              paused={s.paused}
              names={DEV_NAMES}
              sendAction={(a) => log('action', a)}
              onBackToLobby={() => log('nav', 'backToLobby')}
              onToLobby={() => log('nav', 'toLobby')}
            />
          );
        })()}

      {tab.kind === 'lobby' && (
        <LobbyScreen
          games={gameIds.map((id) => ({ id, name: GAME_NAMES[id] ?? id }))}
          gameId={gameIds[0]}
          gameName={GAME_NAMES[gameIds[0]] ?? gameIds[0]}
          players={MOCK_PLAYERS}
          playerId="p-ana"
          isHost={lobbyHost}
          tablePhase="lobby"
          onSelectGame={(gameId) => log('selectGame', gameId)}
          onStart={() => log('nav', 'startGame')}
          onToLobby={() => log('nav', 'toLobby')}
        />
      )}
    </div>
  );
}
