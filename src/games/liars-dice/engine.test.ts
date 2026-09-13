/**
 * engine.test.ts — run with `npm test` (tsc + node --test).
 * Dice are rigged via injected rand: rand() in [(v-1)/6, v/6) rolls face v.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Action,
  DICE_PER_PLAYER,
  GameEvent,
  GameState,
  IllegalActionError,
  applyAction,
  createGame,
  currentPlayerId,
  getView,
  isLegalBid,
} from './engine.js';

/** Narrows to the challengeResolved event (assert.ok doesn't narrow for TS). */
function challengeResult(events: GameEvent[]) {
  const e = events.find(
    (ev): ev is Extract<GameEvent, { type: 'challengeResolved' }> =>
      ev.type === 'challengeResolved',
  );
  assert.ok(e, 'expected a challengeResolved event');
  return e.result;
}

/** rand that rolls exactly the given faces, cycling forever. */
function rigged(faces: number[]): () => number {
  let i = 0;
  return () => {
    const v = faces[i++ % faces.length];
    assert.ok(v >= 1 && v <= 6, `bad rigged face ${v}`);
    return (v - 1) / 6 + 0.01;
  };
}

function bid(player: string, quantity: number, face: 2 | 3 | 4 | 5 | 6): Action {
  return { type: 'bid', quantity, face };
}

test('creates a game with 5 hidden dice per player', () => {
  const s = createGame(['a', 'b', 'c'], rigged([3]));
  assert.equal(s.players.length, 3);
  for (const p of s.players) {
    assert.equal(p.dice.length, DICE_PER_PLAYER);
    assert.ok(p.dice.every((d) => d >= 1 && d <= 6));
  }
  assert.equal(s.turnIndex, 0);
  assert.equal(s.round, 1);
  assert.equal(s.phase, 'bidding');
  assert.equal(s.currentBid, null);
});

test('needs at least 2 players', () => {
  assert.throws(() => createGame(['a']), IllegalActionError);
});

test('validates bids', () => {
  let s = createGame(['a', 'b'], rigged([3]));
  // Opening bid: anything within the dice on the table.
  assert.ok(isLegalBid(s, 'a', 3, 4));
  assert.ok(!isLegalBid(s, 'a', 0, 4)); // no zero bids
  assert.ok(!isLegalBid(s, 'a', 1, 1)); // ones are wild, never bid
  assert.ok(!isLegalBid(s, 'a', 1, 7)); // off the die
  assert.ok(!isLegalBid(s, 'a', 11, 4)); // more dice than exist (10)
  assert.ok(!isLegalBid(s, 'b', 3, 4)); // not b's turn

  s = applyAction(s, 'a', bid('a', 3, 4)).state;
  assert.equal(currentPlayerId(s), 'b');
  assert.ok(!isLegalBid(s, 'b', 3, 4)); // must raise
  assert.ok(!isLegalBid(s, 'b', 3, 3)); // same count, lower face
  assert.ok(!isLegalBid(s, 'b', 2, 6)); // fewer dice
  assert.ok(isLegalBid(s, 'b', 3, 5)); // same count, higher face
  assert.ok(isLegalBid(s, 'b', 4, 2)); // more dice, any face
});

test('rejects out-of-turn and post-game actions', () => {
  const s = createGame(['a', 'b'], rigged([3]));
  assert.throws(() => applyAction(s, 'b', bid('b', 2, 2)), IllegalActionError);
  assert.throws(() => applyAction(s, 'b', { type: 'challenge' }), IllegalActionError);
});

test('cannot challenge with no bid on the table', () => {
  const s = createGame(['a', 'b'], rigged([3]));
  assert.throws(() => applyAction(s, 'a', { type: 'challenge' }), IllegalActionError);
});

test('challenge: bid stands (ones wild) -> challenger loses a die, starts next round', () => {
  // a: 4,4,2,3,5   b: 4,1,2,3,6  -> four 4s counting the wild one.
  const s0 = createGame(['a', 'b'], rigged([4, 4, 2, 3, 5, 4, 1, 2, 3, 6]));
  const s1 = applyAction(s0, 'a', bid('a', 3, 4)).state;
  const { state: s2, events } = applyAction(s1, 'b', { type: 'challenge' }, rigged([2]));

  const result = challengeResult(events);
  assert.equal(result.actualCount, 4);
  assert.equal(result.bidStood, true);
  assert.equal(result.loserId, 'b');

  const b = s2.players.find((p) => p.id === 'b')!;
  const a = s2.players.find((p) => p.id === 'a')!;
  assert.equal(b.dice.length, 4);
  assert.equal(a.dice.length, 5);
  assert.equal(s2.round, 2);
  assert.equal(currentPlayerId(s2), 'b'); // loser starts
  assert.equal(s2.currentBid, null);
});

test('challenge: bid fails -> bidder loses a die and starts', () => {
  // No 4s and no wild ones anywhere: bid of 2x4 must fail.
  const s0 = createGame(['a', 'b'], rigged([2, 3, 5, 6, 2, 2, 3, 5, 6, 3]));
  const s1 = applyAction(s0, 'a', bid('a', 2, 4)).state;
  const { state: s2, events } = applyAction(s1, 'b', { type: 'challenge' }, rigged([2]));

  const result = challengeResult(events);
  assert.equal(result.actualCount, 0);
  assert.equal(result.bidStood, false);
  assert.equal(result.loserId, 'a');
  assert.equal(s2.players.find((p) => p.id === 'a')!.dice.length, 4);
  assert.equal(currentPlayerId(s2), 'a');
});

test('plays a full game to elimination with all dice showing 3', () => {
  // Every die is a 3, so every 1x2 bid fails and the bidder always loses.
  // Turn order: loser starts, so 'a' bids and loses every round until out.
  let s: GameState = createGame(['a', 'b'], rigged([3]));
  let guard = 0;
  while (s.phase !== 'gameOver' && guard++ < 50) {
    const me = currentPlayerId(s);
    s = applyAction(s, me, bid(me, 1, 2), rigged([3])).state;
    const next = currentPlayerId(s);
    const res = applyAction(s, next, { type: 'challenge' }, rigged([3]));
    s = res.state;
    if (res.events.some((e) => e.type === 'playerEliminated')) break;
  }
  // 'a' lost 5 dice across 5 rounds and is out; 'b' wins.
  assert.equal(s.phase, 'gameOver');
  assert.equal(s.winnerId, 'b');
  assert.equal(s.players.length, 1);
});

test('views hide other players dice', () => {
  const s0 = createGame(['a', 'b'], rigged([4, 4, 2, 3, 5, 4, 1, 2, 3, 6]));
  const view = getView(s0, 'a');
  assert.deepEqual(view.yourDice, [4, 4, 2, 3, 5]);
  assert.deepEqual(view.players, [
    { id: 'a', diceCount: 5 },
    { id: 'b', diceCount: 5 },
  ]);
  // No leak: serialized view must not contain b's actual dice.
  const json = JSON.stringify(view);
  assert.ok(!json.includes('[4,1,2,3,6]'));
});

test('actions after game over throw', () => {
  let s: GameState = createGame(['a', 'b'], rigged([3]));
  let guard = 0;
  while (s.phase !== 'gameOver' && guard++ < 50) {
    const me = currentPlayerId(s);
    s = applyAction(s, me, bid(me, 1, 2), rigged([3])).state;
    s = applyAction(s, currentPlayerId(s), { type: 'challenge' }, rigged([3])).state;
  }
  assert.equal(s.phase, 'gameOver');
  assert.throws(() => applyAction(s, s.players[0].id, bid(s.players[0].id, 1, 2)));
});
