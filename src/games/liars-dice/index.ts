/**
 * index.ts — plugs Liar's Dice into the framework as game #1.
 * Adding poker later means adding src/games/poker/ with the same shape.
 */
import { GameDefinition, Rand } from '../../framework.js';
import {
  Action,
  GameState,
  PlayerView,
  applyAction,
  createGame,
  getView,
} from './engine.js';

export const liarsDice: GameDefinition<GameState, Action, PlayerView> = {
  id: 'liars-dice',
  name: "Liar's Dice",
  icon: '🎲',
  minPlayers: 2,
  maxPlayers: 8,

  createGame: (playerIds: string[], rand?: Rand) => createGame(playerIds, rand),
  applyAction: (state, playerId, action, rand?: Rand) =>
    applyAction(state, playerId, action, rand),
  getView: (state, playerId) => getView(state, playerId),
};

export const games = [liarsDice];
