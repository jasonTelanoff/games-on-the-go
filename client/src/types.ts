import type { PlayerView } from '../../src/games/liars-dice/engine.js';

export type Screen = 'connect' | 'lobby' | 'game';
export type TablePhase = 'lobby' | 'playing' | 'paused';

export interface LobbyPlayer {
  id: string;
  name: string;
  connected: boolean;
}

export interface GameOption {
  id: string;
  name: string;
}

export interface AppState {
  screen: Screen;
  tablePhase: TablePhase;
  games: GameOption[];
  gameId: string;
  playerId: string;
  /** Single source of truth for host; client derives isHost from it. */
  hostId: string | null;
  lobbyPlayers: LobbyPlayer[];
  names: Record<string, string>;
  view: PlayerView | null;
  notice: string;
}
