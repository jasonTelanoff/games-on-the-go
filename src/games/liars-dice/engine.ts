/**
 * engine.ts — Liar's Dice, pure game logic. No I/O, no networking.
 *
 * Rules (classic):
 * - Each player starts with 5 hidden dice. Ones are wild.
 * - On your turn: raise the bid, or challenge the current bid ("liar!").
 * - A bid is quantity x face (face 2-6). A raise must be more dice, or the
 *   same number of dice with a higher face.
 * - On challenge, all dice are revealed. If at least `quantity` dice show
 *   the bid face (ones count as any face), the bid stood and the challenger
 *   loses a die; otherwise the bidder loses a die.
 * - The loser starts the next round with fresh dice. Zero dice = eliminated.
 * - Last player with dice wins.
 *
 * Randomness is injected as `rand` so tests can rig the dice.
 */

export const DICE_PER_PLAYER = 5;

export type BidFace = 2 | 3 | 4 | 5 | 6;

export interface Bid {
  playerId: string;
  quantity: number;
  face: BidFace;
}

export interface PlayerState {
  id: string;
  /** Hidden from other players — see getView(). */
  dice: number[];
}

export interface ChallengeResult {
  challengerId: string;
  bid: Bid;
  /** Dice showing the bid face, counting ones as wild. */
  actualCount: number;
  /** True when actualCount >= bid quantity: the challenger loses the die. */
  bidStood: boolean;
  loserId: string;
  /** Every player's dice, revealed by the challenge. Shown in the UI. */
  revealed: { playerId: string; dice: number[] }[];
}

export type Phase = 'bidding' | 'reveal' | 'gameOver';

export interface GameState {
  /** Players still in the game, in seat order. */
  players: PlayerState[];
  /** Index into players of the player whose action is expected. */
  turnIndex: number;
  currentBid: Bid | null;
  /** Every bid placed this round, in order. Reset each round. */
  bidHistory: Bid[];
  round: number;
  lastChallenge: ChallengeResult | null;
  winnerId: string | null;
  phase: Phase;
}

export type Action =
  | { type: 'bid'; quantity: number; face: BidFace }
  | { type: 'challenge' }
  | { type: 'continue' };

export type GameEvent =
  | { type: 'bidPlaced'; bid: Bid }
  | { type: 'challengeResolved'; result: ChallengeResult }
  | { type: 'playerEliminated'; playerId: string }
  | { type: 'gameOver'; winnerId: string };

export type Rand = () => number;

export class IllegalActionError extends Error {}

function rollDie(rand: Rand): number {
  return Math.floor(rand() * 6) + 1;
}

export function createGame(playerIds: string[], rand: Rand = Math.random): GameState {
  if (playerIds.length < 2) {
    throw new IllegalActionError('Need at least 2 players');
  }
  return {
    players: playerIds.map((id) => ({
      id,
      dice: Array.from({ length: DICE_PER_PLAYER }, () => rollDie(rand)),
    })),
    turnIndex: 0,
    currentBid: null,
    bidHistory: [],
    round: 1,
    lastChallenge: null,
    winnerId: null,
    phase: 'bidding',
  };
}

export function currentPlayerId(state: GameState): string {
  return state.players[state.turnIndex].id;
}

function totalDice(state: GameState): number {
  return state.players.reduce((n, p) => n + p.dice.length, 0);
}

/**
 * Pure legality check. The server enforces it; the client can reuse it
 * to enable/disable bid controls without duplicating rule knowledge.
 */
export function isLegalBid(
  state: GameState,
  playerId: string,
  quantity: number,
  face: number,
): boolean {
  if (state.phase !== 'bidding') return false;
  if (currentPlayerId(state) !== playerId) return false;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > totalDice(state)) return false;
  if (!Number.isInteger(face) || face < 2 || face > 6) return false;
  const cur = state.currentBid;
  if (!cur) return true;
  return quantity > cur.quantity || (quantity === cur.quantity && face > cur.face);
}

function countMatching(dice: number[], face: BidFace): number {
  // Ones are wild.
  return dice.filter((d) => d === face || d === 1).length;
}

export interface ActionResult {
  state: GameState;
  events: GameEvent[];
}

export function applyAction(
  state: GameState,
  playerId: string,
  action: Action,
  rand: Rand = Math.random,
): ActionResult {
  if (state.phase === 'gameOver') {
    throw new IllegalActionError('Game is over');
  }

  // --- reveal: the challenge result is on screen; anyone still in the
  // game can tap Continue to deal the next round. ---
  if (state.phase === 'reveal') {
    if (action.type !== 'continue') {
      throw new IllegalActionError('Challenge is being revealed');
    }
    if (!state.players.some((p) => p.id === playerId)) {
      throw new IllegalActionError(`${playerId} is not in the game`);
    }
    return continueFromReveal(state, rand);
  }

  if (currentPlayerId(state) !== playerId) {
    throw new IllegalActionError(`Not ${playerId}'s turn`);
  }

  if (action.type === 'bid') {
    if (!isLegalBid(state, playerId, action.quantity, action.face)) {
      throw new IllegalActionError(`Illegal bid: ${action.quantity}x${action.face}`);
    }
    const bid: Bid = { playerId, quantity: action.quantity, face: action.face };
    const next: GameState = {
      ...state,
      currentBid: bid,
      bidHistory: [...state.bidHistory, bid],
      turnIndex: (state.turnIndex + 1) % state.players.length,
    };
    return { state: next, events: [{ type: 'bidPlaced', bid }] };
  }

  if (action.type === 'continue') {
    throw new IllegalActionError('Nothing to continue');
  }

  // --- challenge: reveal the dice and hold for Continue. The loser only
  // loses their die when the table continues to the next round. ---
  const bid = state.currentBid;
  if (!bid) {
    throw new IllegalActionError('No bid to challenge');
  }

  const allDice = state.players.flatMap((p) => p.dice);
  const actualCount = countMatching(allDice, bid.face);
  const bidStood = actualCount >= bid.quantity;
  const loserId = bidStood ? playerId : bid.playerId;
  const revealed = state.players.map((p) => ({ playerId: p.id, dice: [...p.dice] }));

  const result: ChallengeResult = {
    challengerId: playerId,
    bid,
    actualCount,
    bidStood,
    loserId,
    revealed,
  };
  const next: GameState = {
    ...state,
    lastChallenge: result,
    phase: 'reveal',
  };
  return { state: next, events: [{ type: 'challengeResolved', result }] };
}

/**
 * Resolves the held challenge: the loser drops a die (and may be
 * eliminated), then everyone re-rolls and the loser starts the new round.
 */
function continueFromReveal(state: GameState, rand: Rand): ActionResult {
  const result = state.lastChallenge;
  if (!result) {
    throw new IllegalActionError('No challenge to continue from');
  }
  const loserId = result.loserId;
  const loserPos = state.players.findIndex((p) => p.id === loserId);

  let players = state.players.map((p) =>
    p.id === loserId ? { ...p, dice: p.dice.slice(0, p.dice.length - 1) } : p,
  );
  const eliminated = players.find((p) => p.id === loserId && p.dice.length === 0) ?? null;
  if (eliminated) {
    players = players.filter((p) => p.id !== eliminated.id);
  }

  const events: GameEvent[] = [];
  if (eliminated) {
    events.push({ type: 'playerEliminated', playerId: eliminated.id });
  }

  if (players.length === 1) {
    const done: GameState = {
      players,
      turnIndex: 0,
      currentBid: null,
      bidHistory: [],
      round: state.round,
      lastChallenge: result,
      winnerId: players[0].id,
      phase: 'gameOver',
    };
    events.push({ type: 'gameOver', winnerId: players[0].id });
    return { state: done, events };
  }

  // Fresh round: everyone re-rolls; the challenge loser starts (or, if they
  // were eliminated, the seat after them — both are `loserPos % len`).
  const next: GameState = {
    players: players.map((p) => ({
      ...p,
      dice: Array.from({ length: p.dice.length }, () => rollDie(rand)),
    })),
    turnIndex: loserPos % players.length,
    currentBid: null,
    bidHistory: [],
    round: state.round + 1,
    lastChallenge: result,
    winnerId: null,
    phase: 'bidding',
  };
  return { state: next, events };
}

// ---------------------------------------------------------------------------
// Views: what each player is allowed to see.
// ---------------------------------------------------------------------------

export interface PlayerView {
  yourId: string;
  yourDice: number[];
  /** Other players are counts only — never their dice. */
  players: { id: string; diceCount: number }[];
  turnPlayerId: string | null;
  currentBid: Bid | null;
  /** Every bid placed this round, in order. */
  bidHistory: Bid[];
  round: number;
  lastChallenge: ChallengeResult | null;
  winnerId: string | null;
  phase: Phase;
}

export function getView(state: GameState, playerId: string): PlayerView {
  const you = state.players.find((p) => p.id === playerId);
  return {
    yourId: playerId,
    yourDice: you ? [...you.dice] : [],
    players: state.players.map((p) => ({ id: p.id, diceCount: p.dice.length })),
    turnPlayerId: state.phase === 'bidding' ? currentPlayerId(state) : null,
    currentBid: state.currentBid,
    bidHistory: state.currentBid ? [...state.bidHistory] : [],
    round: state.round,
    lastChallenge: state.lastChallenge,
    winnerId: state.winnerId,
    phase: state.phase,
  };
}
