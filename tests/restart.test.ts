import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/lib/game.ts';
import { generatePuzzle } from '../src/lib/sudoku.ts';

test('restart clears an attempt while preserving the puzzle and original state', () => {
  const puzzle = generatePuzzle('hard', 4);
  let before = engine.fillNotes(engine.createGame(puzzle));
  const empty = before.givens.flatMap((n, i) => n ? [] : [i]);
  before = engine.enter(before, { index: empty[0], value: before.solution[empty[0]] });
  before = engine.addExclusions(before, { indices: empty.slice(1, 3), value: 4 });
  const saved = JSON.stringify(before);
  const after = engine.restartGame(before);
  assert.deepEqual(after, engine.createGame(puzzle));
  assert.equal(JSON.stringify(before), saved);
  assert.equal(engine.undo(after), after);
  assert.deepEqual(engine.restore(JSON.stringify(after)), after);
});

test('restart also reopens a completed puzzle', () => {
  const initial = engine.createGame(generatePuzzle('easy', 8));
  const after = engine.restartGame({ ...initial, values: [...initial.solution] });
  assert.deepEqual(after, initial);
  assert.equal(engine.isComplete(after), false);
});
