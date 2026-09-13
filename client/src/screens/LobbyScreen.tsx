import type { GameOption, LobbyPlayer, TablePhase } from '../types.js';

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
    <div className="card">
      <h1 className="title">{gameName}</h1>

      {tablePhase === 'paused' ? (
        <>
          <p className="hint">Game paused — a player disconnected.</p>
          {isHost ? (
            <button className="btn primary" onClick={onToLobby}>Back to lobby</button>
          ) : (
            <p className="hint">Waiting for the host…</p>
          )}
        </>
      ) : tablePhase === 'playing' ? (
        <p className="hint">A game is in progress — you’re in for the next one.</p>
      ) : (
        <>
          {isHost && games.length > 1 && (
            <>
              <div className="lbl">Game</div>
              <div className="row">
                {games.map((g) => (
                  <button
                    key={g.id}
                    className={'btn' + (g.id === gameId ? ' sel' : '')}
                    onClick={() => onSelectGame(g.id)}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {isHost ? (
            <button className="btn primary" disabled={!canStart} onClick={onStart}>
              {canStart ? 'Start game' : 'Waiting for players…'}
            </button>
          ) : (
            <p className="hint">Waiting for the host to start…</p>
          )}
        </>
      )}

      <ul className="plist">
        {players.map((p) => (
          <li className={'pitem' + (p.id === playerId ? ' me' : '')} key={p.id}>
            {p.name}
            {p.id === playerId ? ' (you)' : ''}
            {!p.connected ? ' — disconnected' : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}
