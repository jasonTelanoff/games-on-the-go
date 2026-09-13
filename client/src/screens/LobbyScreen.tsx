import type { GameOption, LobbyPlayer, TablePhase } from '../types.js';
import {
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
          {isHost && games.length > 1 && (
            <>
              <Label>Game</Label>
              <Row className="my-2">
                {games.map((g) => (
                  <Button
                    key={g.id}
                    size="sm"
                    selected={g.id === gameId}
                    onClick={() => onSelectGame(g.id)}
                  >
                    {g.name}
                  </Button>
                ))}
              </Row>
            </>
          )}

          <ul className="list-none p-0 m-0 mt-2">
            {players.map((p) => (
              <li
                className="flex items-center justify-between gap-2 py-3 border-b border-line/60 first:border-t"
                key={p.id}
              >
                <span className="text-[17px]">
                  {p.name}
                  {p.id === playerId && <span className="text-muted"> · you</span>}
                </span>
                {!p.connected && <Chip>disconnected</Chip>}
              </li>
            ))}
          </ul>
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
