import { useState } from 'react';
import {
  BidFace,
  ChallengeResult,
  GameState,
  PlayerView,
  isLegalBid,
} from '../../../src/games/liars-dice/engine.js';
import type { GameScreenProps } from './types.js';
import { Button, Card, Chip, Die, Hint, Label, Notice, Row, Title, TopBar } from '../components/ui.js';
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
    <div className="mt-4 bg-deep border border-line rounded-[10px] p-3">
      <p className="my-1.5 mb-2.5 text-[15px]">{challengeText(result, names)}</p>
      {result.revealed.map((row) => (
        <div className="flex justify-between items-center py-1" key={row.playerId}>
          <span className="text-[15px]">{who(row.playerId)}</span>
          <span className="flex gap-1">
            {row.dice.map((d, i) => (
              <Die small value={d} key={i} />
            ))}
          </span>
        </div>
      ))}
      {result.eliminatedId && <p className="my-1.5 mb-2.5 text-[15px]">{who(result.eliminatedId)} is out!</p>}
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
    <div className="mt-1.5">
      <Row className="my-2">
        <Button size="sm" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</Button>
        <span className="flex-1 text-center text-[26px] font-bold">{clampedQty}</span>
        <Button size="sm" onClick={() => setQty((q) => Math.min(max, q + 1))}>+</Button>
      </Row>
      <div className="flex gap-2 my-2.5">
        {([2, 3, 4, 5, 6] as BidFace[]).map((f) => (
          <Button
            key={f}
            size="face"
            selected={face === f}
            onClick={() => setFace(f)}
          >
            <Die value={f} />
          </Button>
        ))}
      </div>
      <Button
        variant="primary"
        disabled={!legal}
        onClick={() => sendAction({ type: 'bid', quantity: clampedQty, face })}
      >
        <span className="inline-flex items-center gap-1.5">Bid {clampedQty} × <Die small value={face} /></span>
      </Button>
      {!legal && view.currentBid && (
        <Hint>That bid does not beat the current one.</Hint>
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
    <Card>
      {paused && (
        <Notice>
          Game paused — a player disconnected.
          {isHost && ' Send everyone back to the lobby:'}
        </Notice>
      )}
      {paused && isHost && (
        <Button variant="primary" onClick={onToLobby}>Back to lobby</Button>
      )}
      <TopBar>
        <Chip>Round {v.round}</Chip>
        {isHost && <Chip>host</Chip>}
      </TopBar>

      {v.phase === 'gameOver' ? (
        <>
          <Title>Game over</Title>
          <p className="text-2xl text-center my-4">{who(v.winnerId!)} wins! 🎉</p>
          <Button variant="primary" onClick={onBackToLobby}>Back to lobby</Button>
        </>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto mb-3">
            {v.players.map((p) => (
              <div
                className={
                  'flex-1 min-w-[84px] bg-deep rounded-[10px] p-2 text-center border-2 ' +
                  (p.id === v.turnPlayerId ? 'border-accent' : 'border-line')
                }
                key={p.id}
              >
                <div className="text-sm font-semibold">{who(p.id)}</div>
                <div className="text-[15px] text-muted mt-1">🎲 {p.diceCount}</div>
              </div>
            ))}
          </div>

          <div className="text-[18px] text-center my-3 min-h-[26px]">
            {v.currentBid
              ? <>Bid: {v.currentBid.quantity} × <Die small value={v.currentBid.face} /> ({who(v.currentBid.playerId)})</>
              : 'No bid yet — open the bidding!'}
          </div>

          <Label>Your dice</Label>
          <div className="flex gap-2.5 justify-center flex-wrap my-1.5 mb-3">
            {v.yourDice.map((d, i) => (
              <Die value={d} key={i} />
            ))}
          </div>

          {myTurn ? (
            <>
              <div className="text-center text-xl font-bold text-accent-soft my-2">Your turn!</div>
              <BidControls view={v} playerId={playerId} sendAction={sendAction} />
              {v.currentBid && (
                <Button variant="danger" className="mt-2.5" onClick={() => sendAction({ type: 'challenge' })}>
                  Liar! (challenge)
                </Button>
              )}
            </>
          ) : (
            <Hint>Waiting on {who(v.turnPlayerId!)}…</Hint>
          )}

          {v.lastChallenge && <Reveal result={v.lastChallenge} names={names} />}
        </>
      )}
    </Card>
  );
}
