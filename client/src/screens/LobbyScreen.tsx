import type { GameOption, LobbyPlayer, TablePhase } from '../types.js';
import { Button, Card, Hint, Label, Row, Title } from '../components/ui.js';

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
    <Card>
      <Title>{gameName}</Title>

      {tablePhase === 'paused' ? (
        <>
          <Hint>Game paused — a player disconnected.</Hint>
          {isHost ? (
            <Button variant="primary" onClick={onToLobby}>Back to lobby</Button>
          ) : (
            <Hint>Waiting for the host…</Hint>
          )}
        </>
      ) : tablePhase === 'playing' ? (
        <Hint>A game is in progress — you’re in for the next one.</Hint>
      ) : (
        <>
          {isHost && games.length > 1 && (
            <>
              <Label>Game</Label>
              <Row className="my-2">
                {games.map((g) => (
                  <Button
                    key={g.id}
                    selected={g.id === gameId}
                    onClick={() => onSelectGame(g.id)}
                  >
                    {g.name}
                  </Button>
                ))}
              </Row>
            </>
          )}

          {isHost ? (
            <Button variant="primary" disabled={!canStart} onClick={onStart}>
              {canStart ? 'Start game' : 'Waiting for players…'}
            </Button>
          ) : (
            <Hint>Waiting for the host to start…</Hint>
          )}
        </>
      )}

      <ul className="list-none p-0 my-3">
        {players.map((p) => (
          <li
            className={
              'p-3 border-b border-line text-[17px]' + (p.id === playerId ? ' text-accent-soft' : '')
            }
            key={p.id}
          >
            {p.name}
            {p.id === playerId ? ' (you)' : ''}
            {!p.connected ? ' — disconnected' : ''}
          </li>
        ))}
      </ul>
    </Card>
  );
}
