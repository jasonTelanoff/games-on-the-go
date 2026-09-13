/**
 * DevPlayground — the UI iteration screen. Only reachable in dev via ?dev.
 * Renders any registered game screen against hand-built mock views, with
 * a scenario switcher and an action log showing what the UI would send.
 * Nothing here touches the network.
 */
import { useState } from 'react';
import { GAME_COMPONENTS, GAME_NAMES } from '../games/index.js';
import LobbyScreen from '../screens/LobbyScreen.js';
import { Button, Chip, Hint, Row, Screen, TopBar } from '../components/ui.js';
import { DEV_NAMES, DEV_SCENARIOS } from './mocks.js';
import type { LobbyPlayer } from '../types.js';

const MOCK_PLAYERS: LobbyPlayer[] = [
  { id: 'p-ana', name: 'Ana', avatarId: 'fox', connected: true },
  { id: 'p-ben', name: 'Ben', avatarId: 'panda', connected: true },
  { id: 'p-cat', name: 'Cat', avatarId: 'frog', connected: false },
];

const MOCK_AVATARS: Record<string, string> = {
  'p-ana': 'fox',
  'p-ben': 'panda',
  'p-cat': 'frog',
};

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
      <Screen>
        <TopBar>
          <Chip>dev playground</Chip>
          <Hint className="my-0">?dev — no server needed</Hint>
        </TopBar>
        <Row className="flex-wrap my-2">
          {tabs.map(({ tab: t, label }) => (
            <Button
              key={label}
              size="sm"
              variant={isActive(t) ? 'primary' : 'secondary'}
              onClick={() => { setTab(t); setScenarioIdx(0); }}
            >
              {label}
            </Button>
          ))}
        </Row>

        {tab.kind === 'game' && (
          <Row className="flex-wrap my-2">
            {(DEV_SCENARIOS[tab.gameId] ?? []).map((s, i) => (
              <Button
                key={s.label}
                size="sm"
                variant={i === scenarioIdx ? 'primary' : 'secondary'}
                onClick={() => setScenarioIdx(i)}
              >
                {s.label}
              </Button>
            ))}
          </Row>
        )}

        {tab.kind === 'lobby' && (
          <Row className="my-2">
            <Button size="sm" onClick={() => setLobbyHost((h) => !h)}>
              {lobbyHost ? 'Viewing as host' : 'Viewing as player'} (toggle)
            </Button>
          </Row>
        )}

        {actions.length > 0 && (
          <>
            <Hint className="mt-2 font-mono">
              Action log (what the UI would send):
              {actions.map((a, i) => (
                <div key={i}>{a}</div>
              ))}
            </Hint>
            <Button size="sm" onClick={() => setActions([])}>Clear</Button>
          </>
        )}
      </Screen>

      {tab.kind === 'game' &&
        (() => {
          const scenarios = DEV_SCENARIOS[tab.gameId] ?? [];
          const s = scenarios[scenarioIdx] ?? scenarios[0];
          const GameScreen = GAME_COMPONENTS[tab.gameId];
          if (!s || !GameScreen) return <Hint>No scenarios for this game yet.</Hint>;
          return (
            <GameScreen
              view={s.view}
              playerId={s.view.yourId}
              isHost={s.isHost}
              paused={s.paused}
              names={DEV_NAMES}
              avatars={MOCK_AVATARS}
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
