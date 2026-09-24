import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/lib/game.ts';
import { generatePuzzle } from '../src/lib/sudoku.ts';
import { getPlayableCandidates } from '../src/lib/candidates.ts';

const blank = () => engine.createGame({ ...generatePuzzle('hard', 1), givens: Array(81).fill(0) });

test('batch exclusions are additive across mixed cells, undo atomically, and toggle off when all cells have them', () => {
  let before = engine.fillNotes(blank());
  before = engine.enter(before, { index: 0, value: 4, exclude: true });
  before = engine.enter(before, { index: 1, value: 2, pencil: true });
  const saved = JSON.stringify(before);
  const after = engine.toggleExclusions(before, { indices: [0, 1, 2, 2, 80], value: 4 });
  for (const index of [0, 1, 2, 80]) {
    assert.deepEqual(after.exclusions[index], [4]);
    assert.equal(after.notes[index].includes(4), false);
    assert.equal(after.noteOrigins[index], 'manual');
    assert.equal(getPlayableCandidates(after)[index].has(4), false);
  }
  assert.deepEqual(after.notes[2], before.notes[2].filter(n => n !== 4));
  assert.deepEqual(after.notes[3], before.notes[3]);
  assert.deepEqual(after.exclusions[3], before.exclusions[3]);
  assert.equal(after.noteOrigins[3], 'generated');
  assert.deepEqual(after.values, before.values);
  assert.equal(after.history.length, before.history.length + 1);
  assert.deepEqual({ ...engine.undo(after), redoHistory: [] }, before);
  assert.equal(JSON.stringify(before), saved);
  assert.deepEqual(engine.restore(JSON.stringify(after)), after);
  const toggledOff = engine.toggleExclusions(after, { indices: [0, 1, 2, 80], value: 4 });
  assert.deepEqual([0, 1, 2, 80].map(i => toggledOff.exclusions[i]), [[], [], [], []]);
});

test('batch exclusions skip filled cells, invalid targets and no-ops', () => {
  const puzzle = engine.createGame(generatePuzzle('hard', 1));
  const given = puzzle.givens.findIndex(Boolean);
  const empty = puzzle.givens.findIndex(n => !n);
  const entered = engine.enter(puzzle, { index: empty, value: 2 });
  assert.equal(engine.toggleExclusions(entered, { indices: [given, empty, -1, 81, NaN, 1.5], value: 4 }), entered);
  assert.equal(engine.toggleExclusions(entered, { indices: [], value: 4 }), entered);
  for (const value of [0, -1, 10, NaN, 1.5]) {
    assert.equal(engine.toggleExclusions(entered, { indices: [0], value }), entered);
  }
  const complete = { ...puzzle, values: [...puzzle.solution] };
  assert.equal(engine.toggleExclusions(complete, { indices: [0], value: 4 }), complete);
});

test('batch exclusions preserve other exclusions and empty manual ownership through undo', () => {
  const before = engine.enter(blank(), { index: 0, value: 2, exclude: true });
  const after = engine.toggleExclusions(before, { indices: [0, 1], value: 4 });
  assert.deepEqual(after.exclusions[0], [2, 4]);
  assert.deepEqual(after.exclusions[1], [4]);
  assert.deepEqual(after.notes[1], []);
  assert.equal(after.noteOrigins[1], 'manual');
  assert.deepEqual({ ...engine.undo(after), redoHistory: [] }, before);
  const noted = engine.toggleNotes(after, { indices: [0, 1], value: 4 });
  assert.deepEqual(noted.exclusions[0], [2]);
  assert.deepEqual(noted.exclusions[1], []);
});

test('a batch removes an exclusion that every selected empty cell already has', () => {
  let before = engine.enter(blank(), { index: 0, value: 4, exclude: true });
  before = engine.enter(before, { index: 1, value: 4, exclude: true });
  before = engine.enter(before, { index: 1, value: 2, exclude: true });
  const after = engine.toggleExclusions(before, { indices: [0, 1], value: 4 });
  assert.deepEqual([after.exclusions[0], after.exclusions[1]], [[], [2]]);
  assert.deepEqual({ ...engine.undo(after), redoHistory: [] }, before);
  const mixed = engine.toggleExclusions(before, { indices: [0, 1, 2], value: 4 });
  assert.deepEqual([mixed.exclusions[0], mixed.exclusions[1], mixed.exclusions[2]], [[4], [2, 4], [4]]);
});
