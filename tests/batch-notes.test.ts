import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/lib/game.ts';
import { generatePuzzle } from '../src/lib/sudoku.ts';
const blank = () => engine.createGame({ ...generatePuzzle('hard', 1), givens: Array(81).fill(0) });

test('batch notes add to mixed cells, clear exclusions, and undo as one action', () => {
  const noted = engine.enter(blank(), { index: 0, value: 4, pencil: true });
  const before = engine.enter(noted, { index: 1, value: 4, exclude: true });
  const after = engine.toggleNotes(before, { indices: [0, 1, 2, 2, 80], value: 4 });
  for (const index of [0, 1, 2, 80]) {
    assert.deepEqual(after.notes[index], [4]);
    assert.deepEqual(after.exclusions[index], []);
    assert.equal(after.noteOrigins[index], 'manual');
  }
  assert.deepEqual(after.notes[3], []);
  assert.deepEqual(after.values, before.values);
  assert.equal(after.history.length, before.history.length + 1);
  assert.deepEqual({ ...engine.undo(after), redoHistory: [] }, before);
  assert.deepEqual(before.exclusions[1], [4]);
  assert.deepEqual(engine.restore(JSON.stringify(after)), after);
});

test('batch notes claim generated notes and remove a shared generated note without dropping other digits', () => {
  // A 4 at cell 80 keeps 4 out of the generated notes in its row, column and box (cell 79 is one of them).
  const before = engine.fillNotes(engine.enter(blank(), { index: 80, value: 4 }));
  const shared = [0, 1];
  const lacking = 79;
  assert.ok(shared.every(i => before.notes[i].includes(4)) && !before.notes[lacking].includes(4));
  const removed = engine.toggleNotes(before, { indices: shared, value: 4 });
  for (const i of shared) {
    assert.deepEqual(removed.notes[i], before.notes[i].filter(n => n !== 4));
    assert.equal(removed.noteOrigins[i], 'manual');
  }
  const mixed = engine.toggleNotes(before, { indices: [shared[0], lacking], value: 4 });
  assert.deepEqual(mixed.notes[shared[0]], before.notes[shared[0]]);
  assert.ok(mixed.notes[lacking].includes(4));
  assert.equal(mixed.noteOrigins[shared[0]], 'manual');
  assert.deepEqual({ ...engine.undo(removed), redoHistory: [] }, before);
});

test('batch notes ignore protected cells and invalid indices', () => {
  const puzzle = engine.createGame(generatePuzzle('hard', 1));
  const given = puzzle.givens.findIndex(Boolean);
  const empty = puzzle.givens.findIndex(n => !n);
  const entered = engine.enter(puzzle, { index: empty, value: 2 });
  assert.equal(engine.toggleNotes(entered, { indices: [given, empty, -1, 81, NaN, 1.5], value: 4 }), entered);
});

test('batch no-ops and invalid digits do not consume undo history; a shared note toggles off', () => {
  const before = engine.enter(blank(), { index: 0, value: 4, pencil: true });
  assert.deepEqual(engine.toggleNotes(before, { indices: [0, 0], value: 4 }).notes[0], []);
  assert.equal(engine.toggleNotes(before, { indices: [], value: 4 }), before);
  for (const value of [0, -1, 10, NaN, 1.5]) assert.equal(engine.toggleNotes(before, { indices: [1], value }), before);
  const complete = { ...before, values: [...before.solution], notes: Array.from({ length: 81 }, () => []), noteOrigins: Array(81).fill(null) };
  assert.equal(engine.toggleNotes(complete, { indices: [0], value: 4 }), complete);
});

test('a batch removes a note that every selected empty cell already has, as one undo step', () => {
  let before = engine.enter(blank(), { index: 0, value: 4, pencil: true });
  before = engine.enter(before, { index: 1, value: 4, pencil: true });
  before = engine.enter(before, { index: 1, value: 7, pencil: true });
  const after = engine.toggleNotes(before, { indices: [0, 1], value: 4 });
  assert.deepEqual([after.notes[0], after.notes[1]], [[], [7]]);
  assert.equal(after.history.length, before.history.length + 1);
  assert.deepEqual({ ...engine.undo(after), redoHistory: [] }, before);
  const mixed = engine.toggleNotes(before, { indices: [0, 1, 2], value: 4 });
  assert.deepEqual([mixed.notes[0], mixed.notes[1], mixed.notes[2]], [[4], [4, 7], [4]]);
});

test('batch note removal ignores filled cells and works with filtering on', () => {
  let before = engine.enter(blank(), { index: 0, value: 4, pencil: true });
  before = engine.enter(before, { index: 1, value: 4, pencil: true });
  before = engine.enter(before, { index: 2, value: 9 });
  before = { ...before, values: before.values.map((v, i) => i === 8 ? 4 : v) };
  const after = engine.toggleNotes(before, { indices: [0, 1, 2], value: 4, filterNumberKeys: true });
  assert.deepEqual([after.notes[0], after.notes[1]], [[], []]);
});
