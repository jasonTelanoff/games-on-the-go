import type { GameOption, LobbyPlayer, TablePhase } from '../types.js';
import {
  Avatar,
  Button,
  Chip,
  Hint,
  Label,
  Notice,
  Row,
  Screen,
  StickyBar,
  Sub,
  Title,
  cx,
} from '../components/ui.js';

interface Props {
  games: GameOption[];
  gameId: string;
  gameName: string;
  players: LobbyPlayer[];
  playerId: string;
  isHost: boolean;
  tablePhase: TablePhase;
  onSelectGame: (gameId: string) => void;
  onStart: () => void;
  onToLobby: () => void;
}

export default function LobbyScreen({
  games,
  gameId,
  gameName,
  players,
  playerId,
  isHost,
  tablePhase,
  onSelectGame,
  onStart,
  onToLobby,
}: Props) {
  const connectedCount = players.filter((p) => p.connected).length;
  const canStart = connectedCount >= 2;

  return (
    <Screen className="min-h-[85dvh] flex flex-col">
      <Title>{gameName}</Title>
      <Sub>
        {connectedCount} player{connectedCount === 1 ? '' : 's'} in the lobby
      </Sub>

      {tablePhase === 'paused' && (
        <>
          <Notice>Game paused — a player disconnected.</Notice>
          {isHost && (
            <Button variant="primary" onClick={onToLobby}>Back to lobby</Button>
          )}
          {!isHost && <Hint>Waiting for the host…</Hint>}
        </>
      )}

      {tablePhase === 'playing' && (
        <Hint>A game is in progress — you’re in for the next one.</Hint>
      )}

      {tablePhase === 'lobby' && (
        <>
          <ul className="list-none p-0 m-0 mt-2">
            {players.map((p) => (
              <li
                className="flex items-center justify-between gap-2 py-2.5 border-b border-line/60 first:border-t"
                key={p.id}
              >
                <Row>
                  <Avatar id={p.avatarId} size="sm" />
                  <span className="text-[17px]">
                    {p.name}
                    {p.id === playerId && <span className="text-muted"> · you</span>}
                  </span>
                </Row>
                {!p.connected && <Chip>disconnected</Chip>}
              </li>
            ))}
          </ul>

          {games.length > 0 && (
            <div className="mt-5">
              <Label>Game</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {games.map((g) => {
                  const selected = g.id === gameId;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      disabled={!isHost}
                      onClick={() => onSelectGame(g.id)}
                      className={cx(
                        'flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-3 py-5 min-h-[104px] select-none transition-all',
                        selected
                          ? 'border-accent bg-accent/10'
                          : 'border-line/70',
                        isHost ? 'cursor-pointer active:scale-[0.97]' : 'cursor-default',
                        !isHost && !selected && 'opacity-45',
                      )}
                    >
                      <span className="text-[36px] leading-none">{g.icon}</span>
                      <span
                        className={cx(
                          'text-[15px] font-semibold',
                          selected ? 'text-accent-soft' : 'text-ink',
                        )}
                      >
                        {g.name}
                      </span>
                    </button>
                  );
                })}
              </div>
              {!isHost && <Hint className="mt-1.5">The host picks the game</Hint>}
            </div>
          )}
        </>
      )}

      {tablePhase === 'lobby' && (
        <StickyBar>
          {isHost ? (
            <Button variant="primary" disabled={!canStart} onClick={onStart}>
              {canStart ? 'Start game' : 'Waiting for players…'}
            </Button>
          ) : (
            <Hint className="text-center flex-1 my-3">Waiting for the host to start…</Hint>
          )}
        </StickyBar>
      )}
    </Screen>
  );
}
