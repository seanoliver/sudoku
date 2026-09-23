import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, enter, undo } from '../src/lib/game.ts';
import { generatePuzzle, conflicts } from '../src/lib/sudoku.ts';
import { DEFAULT_PREFS, restorePreferences } from '../src/lib/preferences.ts';

test('blocking rejects a wrong answer without duplicates or changes to history and annotations', () => {
  const puzzle = generatePuzzle('hard', 19);
  let game = createGame({ ...puzzle, givens: Array(81).fill(0) });
  const value = game.solution[0] % 9 + 1;
  game = enter(game, { index: 0, value, pencil: true });
  const accepted = enter(game, { index: 0, value, blockIncorrectAnswers: false });
  assert.equal(conflicts(accepted.values).size, 0);
  assert.equal(accepted.values[0], value);
  assert.equal(enter(game, { index: 0, value, blockIncorrectAnswers: true }), game);
  const correct = enter(game, { index: 0, value: game.solution[0], blockIncorrectAnswers: true });
  assert.equal(correct.values[0], game.solution[0]);
  assert.deepEqual({ ...undo(correct), redoHistory: [] }, game);
  assert.equal(enter(correct, { index: 0, value: 0, blockIncorrectAnswers: true }).values[0], 0);
});

test('blocking allows notes and exclusions regardless of the solution', () => {
  const game = createGame(generatePuzzle('hard', 19));
  const index = game.givens.indexOf(0);
  const value = game.solution[index] % 9 + 1;
  assert.deepEqual(enter(game, { index, value, pencil: true, blockIncorrectAnswers: true }).notes[index], [value]);
  assert.deepEqual(enter(game, { index, value, exclude: true, blockIncorrectAnswers: true }).exclusions[index], [value]);
});

test('blocking defaults on, migrates conflict preferences and prefers the new saved setting', () => {
  assert.equal(DEFAULT_PREFS.blockIncorrectAnswers, true);
  for (const enabled of [false, true]) {
    const base = { theme: 'dark', highlightPeers: false, smartHighlighting: true, filterNumberKeys: false };
    const expected = { ...base, blockIncorrectAnswers: enabled, hideTimer: false };
    assert.deepEqual(restorePreferences(JSON.stringify({ ...base, showConflicts: enabled })), expected);
    assert.deepEqual(restorePreferences(JSON.stringify(expected)), expected);
    assert.deepEqual(restorePreferences(JSON.stringify({ ...expected, showConflicts: !enabled })), expected);
  }
});
