import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TableError, TableManager } from './table.js';

test('first player to join becomes the host', () => {
  const mgr = new TableManager();
  const ana = mgr.join('Ana');
  assert.equal(mgr.getTable().hostId, ana.id);
  assert.ok(mgr.isHost(ana.id));
  const ben = mgr.join('Ben');
  assert.ok(!mgr.isHost(ben.id));
  assert.equal(mgr.getTable().hostId, ana.id);
});

test('joining with a connected player\'s name is rejected, not a hijack', () => {
  const mgr = new TableManager();
  const ana = mgr.join('Ana');
  assert.throws(() => mgr.join('ana'), TableError);
  assert.equal(mgr.getTable().players.length, 1);
  assert.equal(mgr.getTable().hostId, ana.id); // host untouched
});

test('rejoining with the same name reclaims the seat (same id)', () => {
  const mgr = new TableManager();
  const ana = mgr.join('Ana');
  mgr.join('Ben');
  mgr.disconnect(ana.id);
  assert.ok(!mgr.getTable().players[0].connected);

  const ana2 = mgr.join('  ana  '); // case-insensitive, trims
  assert.equal(ana2.id, ana.id);
  assert.ok(ana2.connected);
  assert.equal(mgr.getTable().players.length, 2); // no duplicate record
});

test('host migrates on disconnect; og host does not get it back', () => {
  const mgr = new TableManager();
  const ana = mgr.join('Ana'); // host
  const ben = mgr.join('Ben');
  const cat = mgr.join('Cat');

  mgr.disconnect(ana.id);
  assert.equal(mgr.getTable().hostId, ben.id); // next joined, connected

  mgr.disconnect(ben.id);
  assert.equal(mgr.getTable().hostId, cat.id);

  mgr.join('Ana'); // og host returns...
  assert.equal(mgr.getTable().hostId, cat.id); // ...new host keeps it
});

test('lone host disconnect leaves host vacant; next joiner takes it', () => {
  const mgr = new TableManager();
  const ana = mgr.join('Ana');
  mgr.disconnect(ana.id);
  assert.equal(mgr.getTable().hostId, null);
  const ben = mgr.join('Ben');
  assert.equal(mgr.getTable().hostId, ben.id);
});

test('only the host can start; needs 2+ connected players', () => {
  const mgr = new TableManager();
  const ana = mgr.join('Ana');
  assert.throws(() => mgr.startGame(ana.id), TableError); // solo
  const ben = mgr.join('Ben');
  assert.throws(() => mgr.startGame(ben.id), TableError); // not host
  mgr.disconnect(ben.id);
  assert.throws(() => mgr.startGame(ana.id), TableError); // only 1 connected
  mgr.join('Ben'); // rejoin
  mgr.startGame(ana.id);
  assert.equal(mgr.getTable().phase, 'playing');
  // Only connected players are dealt in.
  assert.deepEqual(mgr.getTable().gamePlayerIds, [ana.id, ben.id]);
});

test('a waiting spectator disconnecting mid-game does not pause', () => {
  const mgr = new TableManager();
  const ana = mgr.join('Ana');
  const ben = mgr.join('Ben');
  mgr.startGame(ana.id);
  const cat = mgr.join('Cat'); // joins mid-game, waits
  assert.equal(mgr.disconnect(cat.id), false);
  assert.equal(mgr.getTable().phase, 'playing');
});

test('paused game auto-resumes when every dealt-in player is back', () => {
  const mgr = new TableManager();
  const ana = mgr.join('Ana');
  const ben = mgr.join('Ben');
  mgr.startGame(ana.id);
  mgr.disconnect(ben.id);
  assert.equal(mgr.getTable().phase, 'paused');
  assert.equal(mgr.tryResume(), false); // Ben still gone

  mgr.join('Ben');
  assert.equal(mgr.tryResume(), true);
  assert.equal(mgr.getTable().phase, 'playing');
  assert.equal(mgr.tryResume(), false); // no-op when not paused
});

test('mid-game disconnect pauses; actions are rejected while paused', () => {
  const mgr = new TableManager();
  const ana = mgr.join('Ana');
  const ben = mgr.join('Ben');
  mgr.startGame(ana.id);

  assert.equal(mgr.disconnect(ben.id), true);
  const t = mgr.getTable();
  assert.equal(t.phase, 'paused');
  assert.ok(t.gameState !== null); // state preserved
  assert.throws(() => mgr.applyAction(ana.id, { type: 'bid', quantity: 1, face: 2 }), TableError);

  // Host sends everyone back to the lobby.
  assert.throws(() => mgr.toLobby(ben.id), TableError); // not host
  mgr.toLobby(ana.id);
  assert.equal(mgr.getTable().phase, 'lobby');
  assert.equal(mgr.getTable().gameState, null);
  assert.equal(mgr.getTable().players.length, 2); // everyone kept
});

test('host can pick the game in the lobby', () => {
  const mgr = new TableManager();
  const ana = mgr.join('Ana');
  const ben = mgr.join('Ben');
  assert.throws(() => mgr.selectGame('liars-dice', ben.id), TableError); // not host
  assert.throws(() => mgr.selectGame('nope', ana.id), TableError); // unknown game
  mgr.selectGame('liars-dice', ana.id);
  assert.equal(mgr.getTable().gameId, 'liars-dice');

  mgr.startGame(ana.id);
  assert.throws(() => mgr.selectGame('liars-dice', ana.id), TableError); // mid-game
});

test('table capacity follows the selected game', () => {
  const mgr = new TableManager();
  for (let i = 0; i < 8; i++) mgr.join(`P${i}`);
  assert.throws(() => mgr.join('Extra'), TableError); // liars-dice max is 8
});

test('avatars are assigned, unique, and never duplicated', () => {
  const mgr = new TableManager();
  const ana = mgr.join('Ana', 'fox');
  assert.equal(ana.avatarId, 'fox');
  assert.throws(() => mgr.join('Ben', 'fox'), TableError); // taken
  const ben = mgr.join('Ben', 'panda');
  assert.equal(ben.avatarId, 'panda');
});

test('unknown avatars are rejected; missing ones auto-assign', () => {
  const mgr = new TableManager();
  assert.throws(() => mgr.join('Ana', 'dragon'), TableError);
  const ben = mgr.join('Ben'); // no avatar requested
  assert.ok(ben.avatarId.length > 0);
  const cat = mgr.join('Cat'); // auto-assign skips taken
  assert.ok(cat.avatarId !== ben.avatarId);
});

test('a disconnected seat keeps its avatar; rejoin reclaims it', () => {
  const mgr = new TableManager();
  const ana = mgr.join('Ana', 'fox');
  mgr.disconnect(ana.id);
  assert.throws(() => mgr.join('Ben', 'fox'), TableError); // still Ana's
  const ana2 = mgr.join('ana', 'panda'); // rejoin ignores the new pick
  assert.equal(ana2.id, ana.id);
  assert.equal(ana2.avatarId, 'fox');
});

test('isRejoin distinguishes a returning seat from a new join', () => {
  const mgr = new TableManager();
  assert.equal(mgr.isRejoin('Ana'), false);
  mgr.join('Ana', 'fox');
  assert.equal(mgr.isRejoin('ana'), false); // connected — not a rejoin
  mgr.disconnect(mgr.getTable().players[0].id);
  assert.equal(mgr.isRejoin('  ANA '), true); // trims, case-insensitive
  assert.equal(mgr.isRejoin('Ben'), false);
});
