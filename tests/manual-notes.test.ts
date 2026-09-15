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
  assert.deepEqual(gameEngine.undo(filled), game);
  assert.ok(filled.notes.some(notes => notes.length > 2), 'must not apply hidden singles or the old box threshold');
});

test('editing generated notes claims the whole cell, even when cleared', () => {
  const generated = gameEngine.fillNotes(blank());
  const edited = gameEngine.enter(generated, { index: 0, value: 1, pencil: true });
  assert.equal(edited.noteOrigins[0], 'manual');
  assert.deepEqual(gameEngine.fillNotes(edited).notes[0], [2,3,4,5,6,7,8,9]);
  const cleared = gameEngine.enter(edited, { index: 0, value: 0 });
  assert.equal(cleared.noteOrigins[0], 'manual');
  assert.deepEqual(gameEngine.fillNotes(cleared).notes[0], []);
  assert.deepEqual(gameEngine.undo(edited), generated);
});

test('exclusions toggle, suppress highlights, and never propagate deductions', () => {
  const game = blank();
  const excluded = gameEngine.enter(game, { index: 0, value: 4, exclude: true });
  assert.deepEqual(excluded.exclusions[0], [4]);
  assert.equal(excluded.noteOrigins[0], 'manual');
  const playable = candidates.getPlayableCandidates(excluded);
  assert.equal(playable[0].has(4), false);
  assert.equal(playable[1].has(4), true);
  assert.deepEqual(gameEngine.fillNotes(excluded).notes[0], []);
  const restored = gameEngine.enter(excluded, { index: 0, value: 4, exclude: true });
  assert.deepEqual(restored.exclusions[0], []);
  assert.ok(candidates.getPlayableCandidates(restored)[0].has(4));
  assert.deepEqual(gameEngine.undo(excluded), game);
});

test('positive notes and exclusions are mutually exclusive and manual notes survive Fill', () => {
  const excluded = gameEngine.enter(blank(), { index: 0, value: 4, exclude: true });
  const noted = gameEngine.enter(excluded, { index: 0, value: 4, pencil: true });
  assert.deepEqual(noted.exclusions[0], []);
  assert.deepEqual(gameEngine.fillNotes(noted).notes[0], [4]);
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
  assert.deepEqual(gameEngine.undo(filled), generated);
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
  assert.deepEqual(gameEngine.fillNotes(restored).notes[0], [4]);
  assert.deepEqual(gameEngine.undo(restored), blank());
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
  assert.deepEqual(gameEngine.undo(restored), generated);
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
