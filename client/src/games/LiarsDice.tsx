import { useState } from 'react';
import {
  BidFace,
  ChallengeResult,
  GameState,
  PlayerView,
  isLegalBid,
} from '../../../src/games/liars-dice/engine.js';
import type { GameScreenProps } from './types.js';
import {
  Avatar,
  Button,
  Chip,
  Die,
  Divider,
  Hint,
  Label,
  Notice,
  Row,
  Screen,
  StickyBar,
  TopBar,
} from '../components/ui.js';
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
    <div className="mt-6 border-t border-line/60 pt-4">
      <p className="my-0 mb-3 text-[15px]">{challengeText(result, names)}</p>
      {result.revealed.map((row) => (
        <div className="flex justify-between items-center py-1.5" key={row.playerId}>
          <span className="text-[15px] text-muted">{who(row.playerId)}</span>
          <span className="flex gap-1">
            {row.dice.map((d, i) => (
              <Die size="sm" value={d} key={i} />
            ))}
          </span>
        </div>
      ))}
      {result.eliminatedId && (
        <p className="mt-3 mb-0 text-[15px] font-semibold">{who(result.eliminatedId)} is out!</p>
      )}
    </div>
  );
}

function TurnControls({ view, playerId, sendAction }: {
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
    <>
      <Label>Your bid</Label>
      <Row className="justify-center my-3">
        <div className="w-[52px] shrink-0">
          <Button size="sm" className="text-[22px]" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</Button>
        </div>
        <span className="w-16 text-center text-[30px] font-bold tabular-nums">{clampedQty}</span>
        <div className="w-[52px] shrink-0">
          <Button size="sm" className="text-[22px]" onClick={() => setQty((q) => Math.min(max, q + 1))}>+</Button>
        </div>
      </Row>
      <div className="flex gap-2 my-3">
        {([2, 3, 4, 5, 6] as BidFace[]).map((f) => (
          <Button
            key={f}
            size="face"
            selected={face === f}
            onClick={() => setFace(f)}
            aria-label={`Face ${f}`}
          >
            <Die value={f} />
          </Button>
        ))}
      </div>

      {!legal && view.currentBid && (
        <Hint className="text-center">That bid doesn’t beat the current one.</Hint>
      )}

      <StickyBar>
        <div className="flex-[2]">
          <Button
            variant="primary"
            disabled={!legal}
            onClick={() => sendAction({ type: 'bid', quantity: clampedQty, face })}
          >
            <span className="inline-flex items-center gap-1.5">
              Bid {clampedQty} × <Die size="sm" value={face} />
            </span>
          </Button>
        </div>
        {view.currentBid && (
          <div className="flex-1">
            <Button variant="danger" onClick={() => sendAction({ type: 'challenge' })}>
              Liar!
            </Button>
          </div>
        )}
      </StickyBar>
    </>
  );
}

export default function LiarsDiceGame({
  view: v,
  playerId,
  isHost,
  paused,
  names,
  avatars,
  sendAction,
  onBackToLobby,
  onToLobby,
}: GameScreenProps) {
  const who = (id: string) => names[id] ?? '???';
  const myTurn = v.turnPlayerId === playerId && !paused;

  return (
    <Screen className="min-h-[90dvh] flex flex-col">
      <TopBar>
        <Chip>Round {v.round}</Chip>
        {isHost && <Chip>host</Chip>}
        <div className="flex-1" />
        {paused && <Chip>paused</Chip>}
        {myTurn && <Chip>your turn</Chip>}
      </TopBar>

      {paused && (
        <Notice>
          Game paused — a player disconnected.
          {isHost && ' Send everyone back to the lobby:'}
        </Notice>
      )}
      {paused && isHost && (
        <Button variant="primary" onClick={onToLobby}>Back to lobby</Button>
      )}

      {v.phase === 'gameOver' ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
          <div className="text-[15px] text-muted mb-2">Game over</div>
          <div className="text-[30px] font-bold tracking-tight mb-8">{who(v.winnerId!)} wins 🎉</div>
          <div className="w-full">
            <Button variant="primary" onClick={onBackToLobby}>
              Back to lobby
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Players: your avatar marks you, the accent ring marks the turn. */}
          <div className="flex gap-5 overflow-x-auto py-2">
            {v.players.map((p) => {
              const active = p.id === v.turnPlayerId;
              return (
                <div
                  className={'flex flex-col items-center min-w-[52px] ' + (active ? '' : 'opacity-50')}
                  key={p.id}
                >
                  <span className={'rounded-full p-0.5 ' + (active ? 'ring-2 ring-accent' : '')}>
                    <Avatar id={avatars[p.id]} />
                  </span>
                  <span className={'text-[13px] max-w-[80px] truncate mt-1 ' + (active ? 'font-semibold text-ink' : 'text-muted')}>
                    {who(p.id)}
                    {p.id === playerId && <span className="text-muted font-normal"> · you</span>}
                  </span>
                  <span className="text-[12px] text-muted mt-0.5 tabular-nums">🎲 {p.diceCount}</span>
                </div>
              );
            })}
          </div>

          <Divider className="my-3" />

          {/* Current bid, hero-sized. */}
          <div className="text-center py-5">
            {v.currentBid ? (
              <>
                <div className="text-[44px] font-bold tracking-tight leading-none">
                  {v.currentBid.quantity} × <Die value={v.currentBid.face} />
                </div>
                <div className="text-muted text-[14px] mt-2">bid by {who(v.currentBid.playerId)}</div>
              </>
            ) : (
              <div className="text-muted text-[16px]">No bid yet — open the bidding</div>
            )}
          </div>

          <Label>Your dice</Label>
          <div className="flex gap-2.5 justify-center flex-wrap py-2">
            {v.yourDice.map((d, i) => (
              <Die size="lg" value={d} key={i} />
            ))}
          </div>

          <Divider />

          {myTurn ? (
            <TurnControls view={v} playerId={playerId} sendAction={sendAction} />
          ) : (
            <Hint className="text-center py-4">Waiting on {who(v.turnPlayerId!)}…</Hint>
          )}

          {v.lastChallenge && <Reveal result={v.lastChallenge} names={names} />}
        </>
      )}
    </Screen>
  );
}
