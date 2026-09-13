import type { ComponentType } from 'react';
import type { GameScreenProps } from './types.js';
import LiarsDiceGame from './LiarsDice.js';

/** Game id -> screen component. New games register here. */
export const GAME_COMPONENTS: Record<string, ComponentType<GameScreenProps>> = {
  'liars-dice': LiarsDiceGame,
};

export const GAME_NAMES: Record<string, string> = {
  'liars-dice': "Liar's Dice",
};

export const GAME_ICONS: Record<string, string> = {
  'liars-dice': '🎲',
};
