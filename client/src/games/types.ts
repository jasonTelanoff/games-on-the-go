import type { PlayerView } from '../../../src/games/liars-dice/engine.js';

/**
 * Props every game screen receives. Games are components, not branches:
 * to add a game, write one of these and register it in index.ts.
 */
export interface GameScreenProps {
  view: PlayerView;
  playerId: string;
  isHost: boolean;
  /** True when a disconnect paused the game. */
  paused: boolean;
  names: Record<string, string>;
  avatars: Record<string, string>;
  sendAction: (action: unknown) => void;
  onBackToLobby: () => void;
  onToLobby: () => void;
}
