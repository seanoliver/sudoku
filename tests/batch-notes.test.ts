import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/lib/game.ts';
import { generatePuzzle } from '../src/lib/sudoku.ts';
const blank = () => engine.createGame({ ...generatePuzzle('hard', 1), givens: Array(81).fill(0) });

test('batch notes add rather than toggle, clear exclusions, and undo as one action', () => {
  const noted = engine.enter(blank(), { index: 0, value: 4, pencil: true });
  const before = engine.enter(noted, { index: 1, value: 4, exclude: true });
  const after = engine.addNotes(before, { indices: [0, 1, 2, 2, 80], value: 4 });
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

test('batch notes claim generated notes without dropping other digits', () => {
  const before = engine.fillNotes(blank());
  const after = engine.addNotes(before, { indices: [0, 1], value: 4 });
  assert.deepEqual(after.notes, before.notes);
  assert.equal(after.noteOrigins[0], 'manual');
  assert.equal(after.noteOrigins[1], 'manual');
  assert.equal(after.noteOrigins[2], 'generated');
  assert.deepEqual({ ...engine.undo(after), redoHistory: [] }, before);
});

test('batch notes ignore protected cells and invalid indices', () => {
  const puzzle = engine.createGame(generatePuzzle('hard', 1));
  const given = puzzle.givens.findIndex(Boolean);
  const empty = puzzle.givens.findIndex(n => !n);
  const entered = engine.enter(puzzle, { index: empty, value: 2 });
  assert.equal(engine.addNotes(entered, { indices: [given, empty, -1, 81, NaN, 1.5], value: 4 }), entered);
});

test('batch no-ops and invalid digits do not consume undo history', () => {
  const before = engine.enter(blank(), { index: 0, value: 4, pencil: true });
  assert.equal(engine.addNotes(before, { indices: [0, 0], value: 4 }), before);
  assert.equal(engine.addNotes(before, { indices: [], value: 4 }), before);
  for (const value of [0, -1, 10, NaN, 1.5]) assert.equal(engine.addNotes(before, { indices: [1], value }), before);
  const complete = { ...before, values: [...before.solution], notes: Array.from({ length: 81 }, () => []), noteOrigins: Array(81).fill(null) };
  assert.equal(engine.addNotes(complete, { indices: [0], value: 4 }), complete);
});
