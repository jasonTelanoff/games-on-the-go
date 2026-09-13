import { useState } from 'react';
import {
  BidFace,
  ChallengeResult,
  GameState,
  PlayerView,
  isLegalBid,
} from '../../../src/games/liars-dice/engine.js';
import type { GameScreenProps } from './types.js';
import { dieGlyph } from '../ui.js';

function totalDice(v: PlayerView): number {
  return v.players.reduce((n, p) => n + p.diceCount, 0);
}

/** Rebuild just enough GameState for isLegalBid — no rule duplication. */
function pseudoState(v: PlayerView): GameState {
  return {
    players: v.players.map((p) => ({ id: p.id, dice: new Array(p.diceCount).fill(1) })),
    turnIndex: Math.max(0, v.players.findIndex((p) => p.id === v.turnPlayerId)),
    currentBid: v.currentBid,
    round: v.round,
    lastChallenge: v.lastChallenge,
    winnerId: v.winnerId,
    phase: v.phase,
  };
}

function challengeText(r: ChallengeResult, names: Record<string, string>): string {
  const who = (id: string) => names[id] ?? '???';
  return r.bidStood
    ? `There were ${r.actualCount} ${dieGlyph(r.bid.face)}s — the bid stood. ${who(r.loserId)} loses a die.`
    : `Only ${r.actualCount} ${dieGlyph(r.bid.face)}s — ${who(r.bid.playerId)} was lying! ${who(r.loserId)} loses a die.`;
}

function Reveal({ result, names }: { result: ChallengeResult; names: Record<string, string> }) {
  const who = (id: string) => names[id] ?? '???';
  return (
    <div className="reveal">
      <p className="rtext">{challengeText(result, names)}</p>
      {result.revealed.map((row) => (
        <div className="rrow" key={row.playerId}>
          <span className="rname">{who(row.playerId)}</span>
          <span className="rdice">
            {row.dice.map((d, i) => (
              <span className="die sm" key={i}>{dieGlyph(d)}</span>
            ))}
          </span>
        </div>
      ))}
      {result.eliminatedId && <p className="rtext">{who(result.eliminatedId)} is out!</p>}
    </div>
  );
}

function BidControls({ view, playerId, sendAction }: {
  view: PlayerView;
  playerId: string;
  sendAction: (action: unknown) => void;
}) {
  const max = totalDice(view);
  const [qty, setQty] = useState(3);
  const [face, setFace] = useState<BidFace>(4);
  const clampedQty = Math.min(Math.max(1, qty), max);
  const legal = isLegalBid(pseudoState(view), playerId, clampedQty, face);

  return (
    <div className="bidctl">
      <div className="row">
        <button className="btn small" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
        <span className="qty">{clampedQty}</span>
        <button className="btn small" onClick={() => setQty((q) => Math.min(max, q + 1))}>+</button>
      </div>
      <div className="faces">
        {([2, 3, 4, 5, 6] as BidFace[]).map((f) => (
          <button
            key={f}
            className={'btn face' + (face === f ? ' sel' : '')}
            onClick={() => setFace(f)}
          >
            {dieGlyph(f)}
          </button>
        ))}
      </div>
      <button
        className="btn primary"
        disabled={!legal}
        onClick={() => sendAction({ type: 'bid', quantity: clampedQty, face })}
      >
        Bid {clampedQty} × {dieGlyph(face)}
      </button>
      {!legal && view.currentBid && (
        <p className="hint">That bid does not beat the current one.</p>
      )}
    </div>
  );
}

export default function LiarsDiceGame({
  view: v,
  playerId,
  isHost,
  paused,
  names,
  sendAction,
  onBackToLobby,
  onToLobby,
}: GameScreenProps) {
  const who = (id: string) => names[id] ?? '???';
  const myTurn = v.turnPlayerId === playerId && !paused;

  return (
    <div className="card">
      {paused && (
        <div className="notice">
          Game paused — a player disconnected.
          {isHost && ' Send everyone back to the lobby:'}
        </div>
      )}
      {paused && isHost && (
        <button className="btn primary" onClick={onToLobby}>Back to lobby</button>
      )}
      <div className="topbar">
        <span className="chip">Round {v.round}</span>
        {isHost && <span className="chip">host</span>}
      </div>

      {v.phase === 'gameOver' ? (
        <>
          <h1 className="title">Game over</h1>
          <p className="winner">{who(v.winnerId!)} wins! 🎉</p>
          <button className="btn primary" onClick={onBackToLobby}>Back to lobby</button>
        </>
      ) : (
        <>
          <div className="strip">
            {v.players.map((p) => (
              <div className={'pcard' + (p.id === v.turnPlayerId ? ' turn' : '')} key={p.id}>
                <div className="pname">{who(p.id)}</div>
                <div className="pcount">🎲 {p.diceCount}</div>
              </div>
            ))}
          </div>

          <div className="bidline">
            {v.currentBid
              ? `Bid: ${v.currentBid.quantity} × ${dieGlyph(v.currentBid.face)} (${who(v.currentBid.playerId)})`
              : 'No bid yet — open the bidding!'}
          </div>

          <div className="lbl">Your dice</div>
          <div className="dice">
            {v.yourDice.map((d, i) => (
              <span className="die" key={i}>{dieGlyph(d)}</span>
            ))}
          </div>

          {myTurn ? (
            <>
              <div className="turnbanner">Your turn!</div>
              <BidControls view={v} playerId={playerId} sendAction={sendAction} />
              {v.currentBid && (
                <button className="btn danger" onClick={() => sendAction({ type: 'challenge' })}>
                  Liar! (challenge)
                </button>
              )}
            </>
          ) : (
            <p className="hint">Waiting on {who(v.turnPlayerId!)}…</p>
          )}

          {v.lastChallenge && <Reveal result={v.lastChallenge} names={names} />}
        </>
      )}
    </div>
  );
}
