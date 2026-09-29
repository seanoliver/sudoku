import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, enter, undo, rejectEntry, toggleExclusions, incorrectExclusions } from '../src/lib/game.ts';
import { generatePuzzle, conflicts, peers } from '../src/lib/sudoku.ts';
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

test('blocking allows notes of any digit and exclusions of wrong digits', () => {
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

test('blocking rejects excluding a cell’s answer, and only with blocking on', () => {
  const game = createGame(generatePuzzle('hard', 19));
  const index = game.givens.indexOf(0);
  const answer = game.solution[index];
  assert.deepEqual(rejectEntry(game, { index, value: answer, exclude: true, blockIncorrectAnswers: true }), { kind: 'answer', sources: [], unit: null });
  assert.equal(enter(game, { index, value: answer, exclude: true, blockIncorrectAnswers: true }), game);
  assert.deepEqual(enter(game, { index, value: answer, exclude: true }).exclusions[index], [answer]);
  assert.equal(rejectEntry(game, { index, value: answer, pencil: true, blockIncorrectAnswers: true }), null);
});

test('removing an existing exclusion of the answer is never rejected', () => {
  const game = createGame(generatePuzzle('hard', 19));
  const index = game.givens.indexOf(0);
  const answer = game.solution[index];
  const excluded = enter(game, { index, value: answer, exclude: true });
  assert.equal(rejectEntry(excluded, { index, value: answer, exclude: true, blockIncorrectAnswers: true }), null);
  assert.deepEqual(enter(excluded, { index, value: answer, exclude: true, blockIncorrectAnswers: true }).exclusions[index], []);
});

test('a batch exclusion is refused whole when the digit is the answer in any selected cell', () => {
  const game = createGame(generatePuzzle('hard', 19));
  const empty = game.givens.flatMap((v, i) => v ? [] : [i]);
  const digit = game.solution[empty[0]];
  const others = empty.filter(i => game.solution[i] !== digit).slice(0, 2);
  const indices = [empty[0], ...others];
  assert.deepEqual(incorrectExclusions(game, { indices, value: digit }), [empty[0]]);
  assert.equal(toggleExclusions(game, { indices, value: digit, blockIncorrectAnswers: true }), game);
  assert.deepEqual(incorrectExclusions(game, { indices: others, value: digit }), []);
  assert.deepEqual(toggleExclusions(game, { indices: others, value: digit, blockIncorrectAnswers: true }).exclusions[others[0]], [digit]);
  const excluded = toggleExclusions(game, { indices, value: digit });
  assert.deepEqual(incorrectExclusions(excluded, { indices, value: digit }), []);
  assert.deepEqual(toggleExclusions(excluded, { indices, value: digit, blockIncorrectAnswers: true }).exclusions[empty[0]], []);
});

test('an exclusion on a filled cell or a given is never refused', () => {
  const game = createGame(generatePuzzle('hard', 19));
  const given = game.givens.findIndex(Boolean);
  assert.equal(rejectEntry(game, { index: given, value: game.solution[given], exclude: true, blockIncorrectAnswers: true }), null);
  const empty = game.givens.indexOf(0);
  const filled = enter(game, { index: empty, value: game.solution[empty] });
  assert.equal(rejectEntry(filled, { index: empty, value: game.solution[empty], exclude: true, blockIncorrectAnswers: true }), null);
});

test('with Filter number keys on, a batch is still refused when a wrong peer number would have skipped the answer cell', () => {
  const game = createGame(generatePuzzle('hard', 19));
  const empty = game.givens.flatMap((v, i) => v ? [] : [i]);
  const answerCell = empty[0], digit = game.solution[answerCell];
  const peer = empty.find(i => i !== answerCell && peers(answerCell).includes(i) && game.solution[i] !== digit && !peers(i).some(p => game.values[p] === digit))!;
  const wrongPeer = enter(game, { index: peer, value: digit });
  const other = empty.find(i => i !== answerCell && i !== peer && game.solution[i] !== digit && !peers(i).some(p => wrongPeer.values[p] === digit))!;
  assert.equal(wrongPeer.values[peer], digit);
  assert.deepEqual(incorrectExclusions(wrongPeer, { indices: [answerCell, other], value: digit }), [answerCell]);
  assert.equal(toggleExclusions(wrongPeer, { indices: [answerCell, other], value: digit, filterNumberKeys: true, blockIncorrectAnswers: true }), wrongPeer);
});
