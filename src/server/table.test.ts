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
