/**
 * table.ts — the single table this server hosts. No rooms, no codes:
 * whoever connects joins. The first to join is the host.
 *
 * Names are unique and act as identity: reconnecting with the same name
 * reclaims your seat (same player id, so game state stays valid).
 * A mid-game disconnect pauses the game; the host can send everyone back
 * to the lobby. If the host disconnects, the earliest-joined connected
 * player becomes host — and keeps it when the og host returns.
 *
 * Pure logic, no sockets — the websocket glue in index.ts translates
 * between this and the wire. See table.test.ts.
 */
import { GameDefinition, GameEvent, Rand } from '../framework.js';
import { firstFreeAvatar, isAvatarId } from '../avatars.js';
import { games } from '../games/liars-dice/index.js';

export class TableError extends Error {}

export interface TablePlayer {
  id: string;
  name: string;
  avatarId: string;
  connected: boolean;
}

export type TablePhase = 'lobby' | 'playing' | 'paused';

export interface Table {
  gameId: string;
  /** Join order. Records persist across disconnects so names can rejoin. */
  players: TablePlayer[];
  hostId: string | null;
  phase: TablePhase;
  gamePlayerIds: string[];
  gameState: any;
  lastEvents: GameEvent[];
}

export function gameList(): { id: string; name: string }[] {
  return games.map((g) => ({ id: g.id, name: g.name }));
}

export class TableManager {
  private table: Table;
  private rand: Rand;

  constructor(rand: Rand = Math.random) {
    this.rand = rand;
    this.table = {
      gameId: 'liars-dice',
      players: [],
      hostId: null,
      phase: 'lobby',
      gamePlayerIds: [],
      gameState: null,
      lastEvents: [],
    };
  }

  getTable(): Table {
    return this.table;
  }

  currentGame(): GameDefinition<any, any, any> {
    const game = games.find((g) => g.id === this.table.gameId);
    if (!game) throw new TableError(`Unknown game: ${this.table.gameId}`);
    return game;
  }

  isHost(playerId: string): boolean {
    return this.table.hostId === playerId;
  }

  private requireHost(playerId: string): void {
    if (!this.isHost(playerId)) throw new TableError('Only the host can do that');
  }

  /**
   * New names join; existing names rejoin and reclaim their seat
   * (same id) — but only if the original is gone. Joining with a
   * connected player's name is rejected, not a hijack.
   *
   * Avatars can't be duplicated: a claimed avatar stays with its seat
   * even while disconnected, so a rejoin always gets its avatar back
   * and nobody can snipe it mid-game.
   */
  join(playerName: string, avatarId?: string): TablePlayer {
    const t = this.table;
    const name = playerName.slice(0, 20).trim() || 'Player';
    const existing = t.players.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (existing.connected) throw new TableError(`"${existing.name}" is already here`);
      existing.connected = true;
      if (t.hostId === null) t.hostId = existing.id;
      return existing; // seat keeps its avatar — requested one is ignored
    }
    if (t.players.length >= this.currentGame().maxPlayers) {
      throw new TableError('Table is full');
    }
    const taken = new Set(t.players.map((p) => p.avatarId));
    let avatar: string;
    if (avatarId === undefined) {
      avatar = firstFreeAvatar(taken);
    } else {
      if (!isAvatarId(avatarId)) throw new TableError('Unknown avatar');
      if (taken.has(avatarId)) throw new TableError('That avatar is taken');
      avatar = avatarId;
    }
    const player: TablePlayer = { id: crypto.randomUUID(), name, avatarId: avatar, connected: true };
    t.players.push(player);
    if (t.hostId === null) t.hostId = player.id;
    return player;
  }

  /** Host picks the game. Only in the lobby. */
  selectGame(gameId: string, playerId: string): void {
    const t = this.table;
    this.requireHost(playerId);
    if (t.phase !== 'lobby') throw new TableError('Cannot change the game mid-game');
    const game = games.find((g) => g.id === gameId);
    if (!game) throw new TableError(`Unknown game: ${gameId}`);
    if (t.players.length > game.maxPlayers) {
      throw new TableError(`${game.name} supports at most ${game.maxPlayers} players`);
    }
    t.gameId = gameId;
  }

  startGame(playerId: string): void {
    const t = this.table;
    this.requireHost(playerId);
    if (t.phase !== 'lobby') throw new TableError('Game already in progress');
    const game = this.currentGame();
    const ids = t.players.filter((p) => p.connected).map((p) => p.id);
    if (ids.length < game.minPlayers) {
      throw new TableError(`Need at least ${game.minPlayers} players`);
    }
    t.gamePlayerIds = ids;
    t.gameState = game.createGame(ids, this.rand);
    t.phase = 'playing';
    t.lastEvents = [];
  }

  applyAction(playerId: string, action: unknown): void {
    const t = this.table;
    if (t.phase === 'paused') throw new TableError('Game is paused');
    if (t.phase !== 'playing' || !t.gameState) throw new TableError('No game in progress');
    const { state, events } = this.currentGame().applyAction(
      t.gameState,
      playerId,
      action,
      this.rand,
    );
    t.gameState = state;
    t.lastEvents = events;
  }

  /** True when the last applied action ended the game. */
  gameEnded(): boolean {
    return this.table.lastEvents.some((e) => e.type === 'gameOver');
  }

  /** Host sends everyone back to the lobby, discarding the current game. */
  toLobby(playerId: string): void {
    const t = this.table;
    this.requireHost(playerId);
    if (t.phase === 'lobby') throw new TableError('Already in the lobby');
    this.resetToLobby();
  }

  /** Back to the lobby, keeping the players. */
  resetToLobby(): void {
    const t = this.table;
    t.phase = 'lobby';
    t.gamePlayerIds = [];
    t.gameState = null;
    t.lastEvents = [];
  }

  inGame(playerId: string): boolean {
    return this.table.gamePlayerIds.includes(playerId);
  }

  viewFor(playerId: string): unknown {
    const t = this.table;
    if (t.phase !== 'playing' || !t.gameState) return null;
    return this.currentGame().getView(t.gameState, playerId);
  }

  /**
   * Mark a player disconnected. A dealt-in player disconnecting mid-game
   * pauses it (a waiting spectator disconnecting does not). Host migrates
   * to the earliest-joined connected player; the og host does not get it
   * back on rejoin. Returns true when this disconnect paused the game.
   */
  disconnect(playerId: string): boolean {
    const t = this.table;
    const player = t.players.find((p) => p.id === playerId);
    if (!player || !player.connected) return false;
    player.connected = false;
    let paused = false;
    if (t.phase === 'playing' && t.gamePlayerIds.includes(playerId)) {
      t.phase = 'paused';
      paused = true;
    }
    if (t.hostId === playerId) {
      t.hostId = t.players.find((p) => p.connected)?.id ?? null;
    }
    return paused;
  }

  /**
   * Resume a paused game once every dealt-in player is connected again.
   * Returns true when the game resumed.
   */
  tryResume(): boolean {
    const t = this.table;
    if (t.phase !== 'paused') return false;
    const allBack = t.gamePlayerIds.every((id) =>
      t.players.some((p) => p.id === id && p.connected),
    );
    if (!allBack) return false;
    t.phase = 'playing';
    return true;
  }
}
