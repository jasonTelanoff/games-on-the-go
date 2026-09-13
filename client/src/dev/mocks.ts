/**
 * Dev-playground mock data. Each scenario is a hand-built game view plus
 * the props the screen needs — no server, no second browser, no playing
 * through a whole game to see the "challenge reveal" state.
 *
 * To cover a new game's UI, add its scenarios here keyed by game id.
 */
import type { PlayerView } from '../../../src/games/liars-dice/engine.js';

export interface DevScenario {
  label: string;
  view: PlayerView;
  isHost: boolean;
  paused: boolean;
}

const ANA = 'p-ana';
const BEN = 'p-ben';
const CAT = 'p-cat';

export const DEV_NAMES: Record<string, string> = {
  [ANA]: 'Ana',
  [BEN]: 'Ben',
  [CAT]: 'Cat',
};

function base(over: Partial<PlayerView>): PlayerView {
  return {
    yourId: ANA,
    yourDice: [3, 1, 5, 2, 6],
    players: [
      { id: ANA, diceCount: 5 },
      { id: BEN, diceCount: 5 },
      { id: CAT, diceCount: 5 },
    ],
    turnPlayerId: ANA,
    currentBid: null,
    bidHistory: [],
    round: 1,
    lastChallenge: null,
    winnerId: null,
    phase: 'bidding',
    ...over,
  };
}

export const LIARS_DICE_SCENARIOS: DevScenario[] = [
  {
    label: 'My turn, no bid yet',
    view: base({}),
    isHost: false,
    paused: false,
  },
  {
    label: "Their turn, bid on the table",
    view: base({
      turnPlayerId: CAT,
      currentBid: { playerId: BEN, quantity: 4, face: 3 },
    }),
    isHost: false,
    paused: false,
  },
  {
    label: 'My turn, must beat a bid',
    view: base({
      turnPlayerId: ANA,
      currentBid: { playerId: CAT, quantity: 7, face: 6 },
      bidHistory: [
        { playerId: ANA, quantity: 5, face: 6 },
        { playerId: BEN, quantity: 6, face: 4 },
        { playerId: CAT, quantity: 7, face: 6 },
      ],
    }),
    isHost: true,
    paused: false,
  },
  {
    label: 'Challenge reveal (liar!)',
    view: base({
      phase: 'reveal',
      turnPlayerId: null,
      currentBid: { playerId: CAT, quantity: 5, face: 6 },
      lastChallenge: {
        kind: 'challenge',
        challengerId: ANA,
        bid: { playerId: CAT, quantity: 5, face: 6 },
        actualCount: 2,
        bidStood: false,
        loserIds: [CAT],
        revealed: [
          { playerId: ANA, dice: [3, 1, 5, 2, 6] },
          { playerId: BEN, dice: [6, 6, 2, 4, 3] },
          { playerId: CAT, dice: [1, 4, 2, 5, 3] },
        ],
      },
    }),
    isHost: false,
    paused: false,
  },
  {
    label: 'Challenge reveal (bid stood)',
    view: base({
      phase: 'reveal',
      turnPlayerId: null,
      currentBid: { playerId: BEN, quantity: 3, face: 2 },
      lastChallenge: {
        kind: 'challenge',
        challengerId: CAT,
        bid: { playerId: BEN, quantity: 3, face: 2 },
        actualCount: 4,
        bidStood: true,
        loserIds: [CAT],
        revealed: [
          { playerId: ANA, dice: [2, 1, 5, 2, 6] },
          { playerId: BEN, dice: [2, 6, 2, 4, 3] },
          { playerId: CAT, dice: [1, 4, 2, 5, 3] },
        ],
      },
    }),
    isHost: false,
    paused: false,
  },
  {
    label: 'Someone eliminated',
    view: base({
      phase: 'reveal',
      yourDice: [3, 1],
      players: [
        { id: ANA, diceCount: 2 },
        { id: BEN, diceCount: 4 },
        { id: CAT, diceCount: 0 },
      ],
      turnPlayerId: null,
      round: 6,
      currentBid: { playerId: ANA, quantity: 3, face: 4 },
      lastChallenge: {
        kind: 'challenge',
        challengerId: BEN,
        bid: { playerId: CAT, quantity: 2, face: 5 },
        actualCount: 0,
        bidStood: false,
        loserIds: [CAT],
        revealed: [
          { playerId: ANA, dice: [3, 1, 5, 2, 6] },
          { playerId: BEN, dice: [6, 6, 2, 4] },
          { playerId: CAT, dice: [3] },
        ],
      },
    }),
    isHost: false,
    paused: false,
  },
  {
    label: 'Paused (host view)',
    view: base({
      turnPlayerId: CAT,
      currentBid: { playerId: BEN, quantity: 4, face: 3 },
    }),
    isHost: true,
    paused: true,
  },
  {
    label: 'Paused (not host)',
    view: base({
      turnPlayerId: CAT,
      currentBid: { playerId: BEN, quantity: 4, face: 3 },
    }),
    isHost: false,
    paused: true,
  },
  {
    label: 'Game over',
    view: base({
      turnPlayerId: null,
      phase: 'gameOver',
      winnerId: ANA,
      yourDice: [4, 4, 1],
      players: [
        { id: ANA, diceCount: 3 },
        { id: BEN, diceCount: 0 },
        { id: CAT, diceCount: 0 },
      ],
    }),
    isHost: true,
    paused: false,
  },
];

/** gameId -> scenarios. New games add an entry here. */
export const DEV_SCENARIOS: Record<string, DevScenario[]> = {
  'liars-dice': LIARS_DICE_SCENARIOS,
};
