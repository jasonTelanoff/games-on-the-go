/**
 * framework.ts — the plugin contract every game implements.
 *
 * The server only talks to games through GameDefinition: the table,
 * player sessions, and the websocket protocol live in one place, and
 * each game is a pure state machine plugged into it.
 *
 * Keep this file boring. It earns new features when the second game
 * needs them, not before.
 */

export type Rand = () => number;

/** Loose event shape: games emit typed events, the server just forwards them. */
export interface GameEvent {
  type: string;
  [key: string]: unknown;
}

export interface ActionResult<S> {
  state: S;
  events: GameEvent[];
}

export interface GameDefinition<S, A, V> {
  id: string;
  name: string;
  /** Emoji placeholder shown in the game picker until real art lands. */
  icon: string;
  minPlayers: number;
  maxPlayers: number;

  /** Fresh game state for the given player ids (in seat order). */
  createGame(playerIds: string[], rand?: Rand): S;

  /**
   * Apply one player's action. Must be pure (no I/O) and must throw
   * IllegalActionError (or any Error) for illegal actions — the server
   * turns that into an { kind: 'error' } message.
   */
  applyAction(state: S, playerId: string, action: A, rand?: Rand): ActionResult<S>;

  /**
   * Per-player view of the state. This is where hidden information lives:
   * never put another player's secrets in their view.
   */
  getView(state: S, playerId: string): V;
}

// ---------------------------------------------------------------------------
// Wire protocol. Game-agnostic envelopes; game-specific payloads inside.
// No rooms: one server hosts one table. Whoever connects joins; the first
// to join is the host. Names are unique and act as identity: reconnecting
// with the same name reclaims your seat. The client always talks to the
// server that served the page, so there is no server address to configure.
// ---------------------------------------------------------------------------

export type ClientMessage =
  | { kind: 'hello'; playerName: string; avatarId?: string }
  | { kind: 'selectGame'; gameId: string }
  | { kind: 'startGame' }
  | { kind: 'toLobby' }
  | { kind: 'action'; action: unknown };

export type ServerMessage =
  | { kind: 'welcome'; playerId: string; isHost: boolean }
  | {
      kind: 'lobby';
      games: { id: string; name: string; icon: string }[];
      gameId: string;
      hostId: string | null;
      players: { id: string; name: string; avatarId: string; connected: boolean }[];
      /** lobby | playing | paused (a disconnect pauses; host can lobby-ify) */
      phase: 'lobby' | 'playing' | 'paused';
    }
  | { kind: 'gameView'; view: unknown; events: GameEvent[] }
  | { kind: 'error'; message: string };
