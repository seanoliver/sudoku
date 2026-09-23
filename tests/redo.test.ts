import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/lib/game.ts';
import { generatePuzzle } from '../src/lib/sudoku.ts';
const initial = () => engine.createGame(generatePuzzle('hard', 1));

test('redo restores values and all annotations across saved undo/redo steps', () => {
  const start = initial();
  const noted = engine.fillNotes(start);
  const excluded = engine.addExclusions(noted, { indices: [0, 1], value: 2 });
  const entered = engine.enter(excluded, { index: 0, value: 2 });
  const saved = JSON.stringify(entered);
  const twiceUndone = engine.undo(engine.undo(entered));
  assert.deepEqual(twiceUndone.values, noted.values);
  assert.deepEqual(twiceUndone.notes, noted.notes);
  const reopened = engine.restore(JSON.stringify(twiceUndone))!;
  assert.ok(reopened);
  assert.equal(reopened.redoHistory.length, 2);
  assert.deepEqual(engine.redo(engine.redo(reopened)), entered);
  assert.equal(JSON.stringify(entered), saved);
  assert.equal(engine.redo(entered), entered);
  assert.equal(engine.undo(start), start);
});

test('new edits discard redo, while rejected and unchanged actions preserve it', () => {
  const after = engine.enter(initial(), { index: 0, value: 2 });
  const undone = engine.undo(after);
  assert.equal(engine.enter(undone, { index: 2, value: 1 }), undone);
  assert.equal(engine.enter(undone, { index: 0, value: 3, blockIncorrectAnswers: true }), undone);
  assert.deepEqual(engine.redo(engine.addNotes(undone, { indices: [], value: 2 })), after);
  assert.equal(engine.enter(undone, { index: 1, value: 4 }).redoHistory.length, 0);
  assert.equal(engine.fillNotes(undone).redoHistory.length, 0);
  assert.equal(engine.addExclusions(undone, { indices: [1], value: 2 }).redoHistory.length, 0);
  assert.equal(engine.restartGame(undone).redoHistory.length, 0);
});

test('legacy saves migrate without redo and malformed redo snapshots are rejected', () => {
  const game = engine.undo(engine.enter(initial(), { index: 0, value: 2 }));
  const legacy = JSON.parse(JSON.stringify(game));
  delete legacy.redoHistory;
  assert.deepEqual(engine.restore(JSON.stringify(legacy)), { ...game, redoHistory: [] });
  for (const redoHistory of [null, {}, [null], [{ ...game.redoHistory[0], values: [] }], [{ ...game.redoHistory[0], exclusions: Array(81).fill([2]) }], Array(201).fill(game.redoHistory[0])]) {
    assert.equal(engine.restore(JSON.stringify({ ...game, redoHistory })), null);
  }
  const changedGiven = [...game.redoHistory[0].values]; changedGiven[2] = 1;
  assert.equal(engine.restore(JSON.stringify({ ...game, redoHistory: [{ ...game.redoHistory[0], values: changedGiven }] })), null);
});

test('history stays bounded across long solves, undo, redo and branching', () => {
  let game = initial();
  for (let i = 0; i < 230; i++) game = engine.enter(game, { index: 0, value: 2, pencil: true });
  assert.equal(game.history.length, 200);
  const latest = game;
  for (let i = 0; i < 200; i++) game = engine.undo(game);
  assert.equal(game.history.length, 0);
  assert.equal(game.redoHistory.length, 200);
  assert.equal(engine.undo(game), game);
  assert.deepEqual(engine.restore(JSON.stringify(game)), game);
  for (let i = 0; i < 200; i++) game = engine.redo(game);
  assert.deepEqual(game, latest);
  assert.equal(engine.redo(game), game);
});

test('a final placement can be undone and redone exactly', () => {
  const game = initial();
  const before = { ...game, values: game.solution.map((n, i) => i === 0 ? 0 : n) };
  const completed = engine.enter(before, { index: 0, value: 2 });
  assert.equal(engine.isComplete(completed), true);
  const undone = engine.undo(completed);
  assert.equal(engine.isComplete(undone), false);
  assert.deepEqual(engine.redo(undone), completed);
});

test('unchanged Fill notes keeps redo and the combined save limit is enforced', () => {
  const filled = engine.fillNotes(initial());
  const entered = engine.enter(filled, { index: 0, value: 2 });
  const undone = engine.undo(entered);
  assert.equal(engine.fillNotes(undone), undone);
  assert.deepEqual(engine.redo(undone), entered);
  const oversized = { ...undone, history: Array(200).fill(undone.history[0]) };
  assert.equal(engine.restore(JSON.stringify(oversized)), null);
});

test('erasing an empty cell in annotation modes preserves redo and history', () => {
  const pristine = initial();
  const cleared = engine.enter(engine.enter(pristine, { index: 0, value: 2, pencil: true }), { index: 0, value: 0 });
  for (const before of [pristine, cleared]) {
    const entered = engine.enter(before, { index: 1, value: 4 });
    const undone = engine.undo(entered);
    for (const mode of [{ pencil: true }, { exclude: true }]) {
      const erased = engine.enter(undone, { index: 0, value: 0, ...mode });
      assert.equal(erased, undone);
      assert.deepEqual(engine.redo(erased), entered);
    }
  }
});
