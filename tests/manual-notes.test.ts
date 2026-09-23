import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as gameEngine from '../src/lib/game.ts';
import * as candidates from '../src/lib/candidates.ts';
import { generatePuzzle, possibleCells } from '../src/lib/sudoku.ts';
const blank = () => gameEngine.createGame({ ...generatePuzzle('hard', 1), givens: Array(81).fill(0) });

test('Fill notes is available as an explicit game action', () => {
  assert.equal(typeof gameEngine.fillNotes, 'function');
});

test('Fill notes adds all legal candidates once and undo restores the entire board', () => {
  const game = gameEngine.createGame(generatePuzzle('hard', 1));
  const filled = gameEngine.fillNotes(game);
  for (let i = 0; i < 81; i++) {
    const expected = Array.from({ length: 9 }, (_, n) => n + 1).filter(n => possibleCells(game.values, n).has(i));
    assert.deepEqual(filled.notes[i], expected);
    if (expected.length) assert.equal(filled.noteOrigins[i], 'generated');
  }
  assert.equal(filled.history.length, 1);
  assert.equal(gameEngine.fillNotes(filled), filled);
  assert.deepEqual({ ...gameEngine.undo(filled), redoHistory: [] }, game);
  assert.ok(filled.notes.some(notes => notes.length > 2), 'must not apply hidden singles or the old box threshold');
});

test('Fill notes rebuilds manually edited and cleared cells', () => {
  const generated = gameEngine.fillNotes(blank());
  const edited = gameEngine.enter(generated, { index: 0, value: 1, pencil: true });
  assert.equal(edited.noteOrigins[0], 'manual');
  assert.deepEqual(gameEngine.fillNotes(edited).notes[0], [1,2,3,4,5,6,7,8,9]);
  const cleared = gameEngine.enter(edited, { index: 0, value: 0 });
  assert.equal(cleared.noteOrigins[0], 'manual');
  assert.deepEqual(gameEngine.fillNotes(cleared).notes[0], [1,2,3,4,5,6,7,8,9]);
  assert.deepEqual({ ...gameEngine.undo(edited), redoHistory: [] }, generated);
});

test('exclusions toggle, suppress highlights, and never propagate deductions', () => {
  const game = blank();
  const excluded = gameEngine.enter(game, { index: 0, value: 4, exclude: true });
  assert.deepEqual(excluded.exclusions[0], [4]);
  assert.equal(excluded.noteOrigins[0], 'manual');
  const playable = candidates.getPlayableCandidates(excluded);
  assert.equal(playable[0].has(4), false);
  assert.equal(playable[1].has(4), true);
  assert.deepEqual(gameEngine.fillNotes(excluded).notes[0], [1,2,3,5,6,7,8,9]);
  const restored = gameEngine.enter(excluded, { index: 0, value: 4, exclude: true });
  assert.deepEqual(restored.exclusions[0], []);
  assert.ok(candidates.getPlayableCandidates(restored)[0].has(4));
  assert.deepEqual({ ...gameEngine.undo(excluded), redoHistory: [] }, game);
});

test('positive notes and exclusions are mutually exclusive and Fill replaces manual notes', () => {
  const excluded = gameEngine.enter(blank(), { index: 0, value: 4, exclude: true });
  const noted = gameEngine.enter(excluded, { index: 0, value: 4, pencil: true });
  assert.deepEqual(noted.exclusions[0], []);
  assert.deepEqual(gameEngine.fillNotes(noted).notes[0], [1,2,3,4,5,6,7,8,9]);
  const ruledOut = gameEngine.enter(noted, { index: 0, value: 4, exclude: true });
  assert.deepEqual(ruledOut.notes[0], []);
  assert.deepEqual(ruledOut.exclusions[0], [4]);
});

test('value entry clears peer notes without taking ownership; erase does not refill them', () => {
  const generated = gameEngine.fillNotes(blank());
  const filled = gameEngine.enter(generated, { index: 0, value: 4 });
  assert.equal(filled.notes[1].includes(4), false);
  assert.equal(filled.noteOrigins[1], 'generated');
  assert.deepEqual(filled.notes[0], []);
  assert.deepEqual(filled.exclusions[0], []);
  const erased = gameEngine.enter(filled, { index: 0, value: 0 });
  assert.equal(erased.notes[1].includes(4), false);
  assert.equal(gameEngine.fillNotes(erased).notes[1].includes(4), true);
  assert.deepEqual({ ...gameEngine.undo(filled), redoHistory: [] }, generated);
});

test('value entry clears the digit from peer exclusions and keeps unrelated ones', () => {
  let game = blank();
  for (const index of [1, 9, 10, 80]) game = gameEngine.enter(game, { index, value: 3, exclude: true });
  game = gameEngine.enter(game, { index: 1, value: 5, exclude: true });
  const filled = gameEngine.enter(game, { index: 0, value: 3 });
  assert.deepEqual([1, 9, 10].map(i => filled.exclusions[i]), [[5], [], []]);
  assert.deepEqual(filled.exclusions[80], [3]);
  assert.deepEqual({ ...gameEngine.undo(filled), redoHistory: [] }, game);
});

test('annotations and ownership round-trip; legacy saves and history migrate to manual', () => {
  const noted = gameEngine.enter(blank(), { index: 0, value: 4, pencil: true });
  const excluded = gameEngine.enter(noted, { index: 1, value: 5, exclude: true });
  assert.deepEqual(gameEngine.restore(JSON.stringify(excluded)), excluded);
  const legacy = JSON.parse(JSON.stringify(noted));
  delete legacy.exclusions; delete legacy.noteOrigins;
  for (const snapshot of legacy.history) { delete snapshot.exclusions; delete snapshot.noteOrigins; }
  const restored = gameEngine.restore(JSON.stringify(legacy))!;
  assert.equal(restored.noteOrigins[0], 'manual');
  assert.deepEqual(restored.exclusions, Array.from({ length: 81 }, () => []));
  assert.deepEqual(gameEngine.fillNotes(restored).notes[0], [1,2,3,4,5,6,7,8,9]);
  assert.deepEqual({ ...gameEngine.undo(restored), redoHistory: [] }, blank());
});

test('malformed annotation state is rejected, including undo snapshots', () => {
  const game = gameEngine.enter(blank(), { index: 0, value: 4, pencil: true });
  for (const patch of [{ exclusions: null }, { exclusions: Array(81).fill([10]) }, { noteOrigins: [] }, { noteOrigins: Array(81).fill('bad') }, { exclusions: Array(81).fill([4]) }]) {
    assert.equal(gameEngine.restore(JSON.stringify({ ...game, ...patch })), null);
    assert.equal(gameEngine.restore(JSON.stringify({ ...game, history: [{ ...game.history[0], ...patch }] })), null);
  }
});

test('gameplay guard: Fill notes does not solve fresh Hard boards through deduction chaining', () => {
  let fullyReduced = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const game = gameEngine.createGame(generatePuzzle('hard', seed));
    const filled = gameEngine.fillNotes(game);
    if (filled.notes.filter((_, i) => !game.values[i]).every(notes => notes.length === 1)) fullyReduced++;
  }
  assert.equal(fullyReduced, 0, 'review the amount of reasoning performed by Fill notes');
});

test('generated ownership persists through reload, undo, and peer cleanup', () => {
  const generated = gameEngine.fillNotes(blank());
  assert.deepEqual(gameEngine.restore(JSON.stringify(generated)), generated);
  const entered = gameEngine.enter(generated, { index: 0, value: 4 });
  const restored = gameEngine.restore(JSON.stringify(entered))!;
  assert.deepEqual({ ...gameEngine.undo(restored), redoHistory: [] }, generated);
});

test('givens, occupied cells, invalid inputs, and completed games reject annotation changes', () => {
  const game = gameEngine.createGame(generatePuzzle('hard', 1));
  const given = game.givens.findIndex(Boolean);
  assert.equal(gameEngine.enter(game, { index: given, value: 4, exclude: true }), game);
  for (const index of [-1, 81, NaN]) assert.equal(gameEngine.enter(game, { index, value: 4, exclude: true }), game);
  const complete = { ...game, values: [...game.solution] };
  assert.equal(gameEngine.fillNotes(complete), complete);
  assert.equal(gameEngine.enter(complete, { index: 0, value: 4, exclude: true }), complete);
});


test('Fill notes replaces stale notes, retains all exclusions and survives reload and undo', () => {
  let before = gameEngine.enter(blank(), { index: 0, value: 4, pencil: true });
  before = gameEngine.enter(before, { index: 1, value: 4 });
  before = gameEngine.addExclusions(before, { indices: [0, 2], value: 2 });
  before = gameEngine.enter(before, { index: 2, value: 3, exclude: true });
  const serialized = JSON.stringify(before);
  const after = gameEngine.fillNotes(before);
  assert.deepEqual(after.notes[0], [1,3,5,6,7,8,9]);
  assert.deepEqual(after.notes[2], [1,5,6,7,8,9]);
  assert.deepEqual(after.notes[1], []);
  assert.deepEqual(after.exclusions, before.exclusions);
  assert.deepEqual(after.values, before.values);
  assert.equal(after.noteOrigins[0], 'generated');
  assert.equal(after.noteOrigins[2], 'generated');
  assert.equal(after.history.length, before.history.length + 1);
  assert.equal(JSON.stringify(before), serialized);
  assert.equal(gameEngine.fillNotes(after), after);
  const reopened = gameEngine.restore(JSON.stringify(after));
  assert.deepEqual(reopened, after);
  assert.deepEqual({ ...gameEngine.undo(reopened!), redoHistory: [] }, before);
});

test('Fill notes includes blank cells after empty erasure or removing an exclusion', () => {
  const initial = gameEngine.createGame(generatePuzzle('hard', 1));
  let excluded = gameEngine.enter(initial, { index: 0, value: 2, exclude: true });
  excluded = gameEngine.enter(excluded, { index: 0, value: 2, exclude: true });
  for (const before of [excluded, gameEngine.enter(initial, { index: 0, value: 0, pencil: true })]) {
    assert.deepEqual(before.notes[0], []);
    assert.deepEqual(gameEngine.fillNotes(before).notes[0], [2,4,9]);
  }
});

test('Fill notes preserves a fully excluded cell without inventing a candidate', () => {
  let before = blank();
  for (let value = 1; value <= 9; value++) before = gameEngine.enter(before, { index: 0, value, exclude: true });
  const after = gameEngine.fillNotes(before);
  assert.deepEqual(after.notes[0], []);
  assert.deepEqual(after.exclusions[0], [1,2,3,4,5,6,7,8,9]);
  assert.deepEqual(gameEngine.restore(JSON.stringify(after)), after);
});
