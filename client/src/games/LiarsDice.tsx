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
    bidHistory: v.bidHistory,
    round: v.round,
    lastChallenge: v.lastChallenge,
    winnerId: v.winnerId,
    phase: v.phase,
  };
}

function PlayerStrip({ v, names, playerId, avatars }: {
  v: PlayerView;
  names: Record<string, string>;
  playerId: string;
  avatars: Record<string, string>;
}) {
  const who = (id: string) => names[id] ?? '???';
  return (
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
  );
}

function RevealScreen({ result, names, playerId, sendAction }: {
  result: ChallengeResult;
  names: Record<string, string>;
  playerId: string;
  sendAction: (action: unknown) => void;
}) {
  const who = (id: string) => names[id] ?? '???';
  const [continuing, setContinuing] = useState(false);
  const loserSet = new Set(result.loserIds);
  const eliminatedIds = result.revealed
    .filter((r) => loserSet.has(r.playerId) && r.dice.length <= 1)
    .map((r) => r.playerId);
  const isExact = result.kind === 'exact';
  const resultText = isExact
    ? result.bidStood
      ? `Spot on! Everyone but ${who(result.challengerId)} loses a die.`
      : `Not exact — ${who(result.challengerId)} loses a die.`
    : result.bidStood
      ? `The bid stood — ${who(result.challengerId)} loses a die.`
      : `${who(result.bid.playerId)} was lying — ${who(result.loserIds[0])} loses a die.`;
  return (
    <>
      <div className="text-center py-4">
        <div className="text-[15px] text-muted mb-2">
          {who(result.challengerId)} called {isExact ? 'Exact!' : 'Liar!'}</div>
        <div className="text-[30px] font-bold tracking-tight leading-none inline-flex items-center gap-2">
          {result.bid.quantity} × <Die size="sm" value={result.bid.face} />
        </div>
        <div className="text-muted text-[14px] mt-2">
          Actual: {result.actualCount} <span className="text-muted/70">(ones are wild)</span>
        </div>
      </div>

      <Divider className="my-3" />

      {result.revealed.map((row) => (
        <div className="py-2" key={row.playerId}>
          <span className={'text-[15px] ' + (row.playerId === playerId ? 'font-semibold text-ink' : 'text-muted')}>
            {who(row.playerId)}
            {row.playerId === playerId && <span className="text-muted font-normal"> · you</span>}
          </span>
          <div className="flex gap-1 flex-wrap mt-1.5">
            {row.dice.map((d, i) => (
              <Die size="sm" value={d} key={i} />
            ))}
          </div>
        </div>
      ))}

      <div className="my-4 rounded-xl border border-line px-4 py-3 text-[15px] text-center">
        {resultText}
        {eliminatedIds.length > 0 &&
          ` ${eliminatedIds.map(who).join(', ')} ${eliminatedIds.length === 1 ? 'is' : 'are'} out!`}
      </div>

      <StickyBar>
        <Button
          variant="primary"
          disabled={continuing}
          onClick={() => {
            setContinuing(true);
            sendAction({ type: 'continue' });
          }}
        >
          {continuing ? 'Continuing…' : 'Continue'}
        </Button>
      </StickyBar>
    </>
  );
}

function TurnControls({ view, playerId, sendAction }: {
  view: PlayerView;
  playerId: string;
  sendAction: (action: unknown) => void;
}) {
  const max = totalDice(view);
  // Nothing pre-selected: the player taps dice to set the quantity, then picks a face.
  const lowestValid = view.currentBid ? view.currentBid.quantity : 1;
  const [qty, setQty] = useState<number | null>(null);
  const [face, setFace] = useState<BidFace | null>(null);
  const clampedQty = qty === null ? null : Math.min(Math.max(1, qty), max);
  const chosen = clampedQty !== null && face !== null;
  const legal = chosen && isLegalBid(pseudoState(view), playerId, clampedQty, face);

  // One die button: each tap adds a die, the first tap starts at the
  // lowest valid count. The number of taps dictates the count.
  const tapQty = () => setQty((q) => (q === null ? lowestValid : Math.min(max, q + 1)));

  return (
    <>
      <div className="flex items-center justify-between">
        <Label>Your bid</Label>
        {clampedQty !== null && (
          <button
            className="text-[13px] text-muted underline underline-offset-2 px-2 py-1"
            onClick={() => setQty(null)}
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex items-center gap-4 my-3">
        <button
          onClick={tapQty}
          aria-label="Tap to add a die to your bid"
          className="rounded-2xl p-2 transition-transform active:scale-95"
        >
          <Die size="lg" value={face ?? 1} />
        </button>
        <span className="text-[34px] font-bold tabular-nums">
          {clampedQty ?? <span className="text-muted">–</span>}
        </span>
      </div>
      <div className="flex gap-2 my-3">
        {([2, 3, 4, 5, 6] as BidFace[]).map((f) => (
          <Button
            key={f}
            size="face"
            selected={face === f}
            onClick={() => setFace(face === f ? null : f)}
            aria-label={`Face ${f}`}
          >
            <Die value={f} />
          </Button>
        ))}
      </div>

      {chosen && !legal && view.currentBid && (
        <Hint className="text-center">That bid doesn’t beat the current one.</Hint>
      )}
      {!chosen && (
        <Hint className="text-center">Tap the die to set the count, then pick a face.</Hint>
      )}

      <StickyBar>
        <div className="flex-[2]">
          <Button
            variant="primary"
            disabled={!legal}
            onClick={() => {
              if (clampedQty !== null && face !== null) {
                sendAction({ type: 'bid', quantity: clampedQty, face });
              }
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              Bid {clampedQty ?? '–'} × {face !== null ? <Die size="sm" value={face} /> : '–'}
            </span>
          </Button>
        </div>
        {view.currentBid && (
          <>
            <div className="flex-1">
              <Button variant="danger" onClick={() => sendAction({ type: 'challenge' })}>
                Liar!
              </Button>
            </div>
            <div className="flex-1">
              <Button variant="secondary" onClick={() => sendAction({ type: 'exact' })}>
                Exact
              </Button>
            </div>
          </>
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
      ) : v.phase === 'reveal' && v.lastChallenge ? (
        <>
          <PlayerStrip v={v} names={names} playerId={playerId} avatars={avatars} />
          <Divider className="my-3" />
          <RevealScreen result={v.lastChallenge} names={names} playerId={playerId} sendAction={sendAction} />
        </>
      ) : (
        <>
          <PlayerStrip v={v} names={names} playerId={playerId} avatars={avatars} />

          <Divider className="my-3" />

          {/* Current bid, hero-sized. */}
          <div className="text-center py-5">
            {v.currentBid ? (
              <>
                <div className="text-[30px] font-bold tracking-tight leading-none inline-flex items-center gap-2">
                  {v.currentBid.quantity} × <Die size="sm" value={v.currentBid.face} />
                </div>
                <div className="text-muted text-[14px] mt-2">bid by {who(v.currentBid.playerId)}</div>
                {v.bidHistory.length > 1 && (
                  <div className="mt-3 space-y-1">
                    {v.bidHistory.slice(0, -1).map((b, i) => (
                      <div className="text-[13px] text-muted" key={i}>
                        {who(b.playerId)} · {b.quantity}×{dieGlyph(b.face)}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted text-[16px]">No bid yet — open the bidding</div>
            )}
          </div>

          <Label>Your dice</Label>
          <div className="flex gap-2.5 justify-center flex-wrap py-2" key={v.round}>
            {v.yourDice.map((d, i) => (
              <span className="animate-dice-tumble inline-block" style={{ animationDelay: `${i * 60}ms` }} key={i}>
                <Die size="lg" value={d} />
              </span>
            ))}
          </div>

          <Divider />

          {myTurn ? (
            <TurnControls view={v} playerId={playerId} sendAction={sendAction} />
          ) : (
            <Hint className="text-center py-4">Waiting on {who(v.turnPlayerId!)}…</Hint>
          )}
        </>
      )}
    </Screen>
  );
}
