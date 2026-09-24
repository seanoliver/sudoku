import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, enter, undo, restartGame, toggleNotes, toggleExclusions } from '../src/lib/game.ts';
import { generatePuzzle, getEntryDigits } from '../src/lib/sudoku.ts';
import { DEFAULT_PREFS, restorePreferences } from '../src/lib/preferences.ts';

const blank = () => createGame({ ...generatePuzzle('hard', 19), givens: Array(81).fill(0) });

test('filtered entry rejects row, column, and box repeats without changing annotations or history', () => {
  for (const peer of [4, 36, 10]) {
    let game = enter(blank(), { index: peer, value: 4 });
    game = enter(game, { index: 0, value: 4, pencil: true });
    assert.equal(enter(game, { index: 0, value: 4, filterNumberKeys: true }), game);
    assert.equal(enter(game, { index: 0, value: 4, filterNumberKeys: false }).values[0], 4);
  }
});

test('filtering defaults off and migrates missing or invalid flags without resetting other preferences', () => {
  assert.equal(DEFAULT_PREFS.filterNumberKeys, false);
  const legacy = { theme: 'dark', blockIncorrectAnswers: false, highlightPeers: false, smartHighlighting: true };
  for (const flag of [undefined, null, 1, 'true']) {
    assert.deepEqual(restorePreferences(JSON.stringify({ ...legacy, filterNumberKeys: flag })), { ...legacy, filterNumberKeys: false, hideTimer: false });
  }
  for (const enabled of [true, false]) {
    const prefs = { ...legacy, filterNumberKeys: enabled, hideTimer: false };
    assert.deepEqual(restorePreferences(JSON.stringify(prefs)), prefs);
  }
});

test('filtering ignores the replaced value and respects erase, undo and restart', () => {
  const start = blank();
  const filled = enter(start, { index: 0, value: 4, filterNumberKeys: true });
  assert.equal(enter(filled, { index: 0, value: 4, filterNumberKeys: true }), filled);
  const replaced = enter(filled, { index: 0, value: 5, filterNumberKeys: true });
  assert.equal(replaced.values[0], 5);
  assert.deepEqual({ ...undo(replaced), redoHistory: [] }, filled);
  assert.equal(enter(filled, { index: 1, value: 4, filterNumberKeys: true }), filled);
  const erased = enter(filled, { index: 0, value: 0, filterNumberKeys: true });
  assert.equal(enter(erased, { index: 1, value: 4, filterNumberKeys: true }).values[1], 4);
  assert.equal(enter(restartGame(filled), { index: 1, value: 4, filterNumberKeys: true }).values[1], 4);
});

test('filtering does not use the solution, exclusions, notes, or unrelated filled cells', () => {
  let game = blank();
  const wrong = game.solution[0] % 9 + 1;
  game = enter(game, { index: 40, value: wrong });
  game = enter(game, { index: 0, value: wrong, exclude: true });
  assert.equal(enter(game, { index: 0, value: wrong, filterNumberKeys: true }).values[0], wrong);
  assert.equal(enter(game, { index: 0, value: wrong, filterNumberKeys: true, blockIncorrectAnswers: true }), game);
});

test('single and batch annotations are unrestricted with filtering off', () => {
  const game = enter(blank(), { index: 4, value: 4 });
  for (const mode of [{ pencil: true }, { exclude: true }]) {
    const annotated = enter(game, { index: 0, value: 4, ...mode });
    assert.deepEqual(mode.pencil ? annotated.notes[0] : annotated.exclusions[0], [4]);
    const cleared = enter(annotated, { index: 0, value: 4, ...mode });
    assert.deepEqual([cleared.notes[0], cleared.exclusions[0]], [[], []]);
  }
  assert.deepEqual(toggleNotes(game, { indices: [0, 1], value: 4 }).notes[1], [4]);
  assert.deepEqual(toggleExclusions(game, { indices: [0, 1], value: 4 }).exclusions[1], [4]);
});


test('entry choices exclude self, report exhausted cells, and do not mutate the board', () => {
  const values = Array(81).fill(0);
  values[0] = 9;
  assert.deepEqual(getEntryDigits({ values, index: 0 }), [1,2,3,4,5,6,7,8,9]);
  for (let i = 1; i <= 8; i++) values[i] = i;
  values[9] = 9;
  const before = [...values];
  assert.deepEqual(getEntryDigits({ values, index: 0 }), []);
  assert.deepEqual(values, before);
  for (const index of [-1, 81, 0.5, NaN]) assert.deepEqual(getEntryDigits({ values, index }), []);
});

test('filtered notes and exclusions refuse digits already in the row, column, or box', () => {
  for (const mode of [{ pencil: true }, { exclude: true }]) {
    const game = enter(blank(), { index: 4, value: 6 });
    assert.equal(enter(game, { index: 0, value: 6, ...mode, filterNumberKeys: true }), game);
    const unfiltered = enter(game, { index: 0, value: 6, ...mode });
    assert.deepEqual('pencil' in mode ? unfiltered.notes[0] : unfiltered.exclusions[0], [6]);
    assert.notEqual(enter(game, { index: 0, value: 5, ...mode, filterNumberKeys: true }), game);
  }
});

test('filtering still lets a stale note or exclusion be removed', () => {
  for (const mode of [{ pencil: true }, { exclude: true }]) {
    let game = enter(blank(), { index: 0, value: 6, ...mode });
    game = { ...game, values: game.values.map((v, i) => i === 4 ? 6 : v) };
    const removed = enter(game, { index: 0, value: 6, ...mode, filterNumberKeys: true });
    assert.deepEqual('pencil' in mode ? removed.notes[0] : removed.exclusions[0], []);
  }
});

test('filtered batch notes and exclusions skip cells where the digit is blocked', () => {
  const game = enter(blank(), { index: 4, value: 6 });
  for (const apply of [toggleNotes, toggleExclusions]) {
    const next = apply(game, { indices: [0, 80], value: 6, filterNumberKeys: true });
    const marks = apply === toggleNotes ? next.notes : next.exclusions;
    assert.deepEqual([marks[0], marks[80]], [[], [6]]);
    assert.equal(apply(game, { indices: [0], value: 6, filterNumberKeys: true }), game);
    assert.deepEqual((apply === toggleNotes ? apply(game, { indices: [0], value: 6 }).notes : apply(game, { indices: [0], value: 6 }).exclusions)[0], [6]);
  }
});
