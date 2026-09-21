import { automaticNotes, getCandidates } from '../src/lib/candidates.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePuzzle, countSolutions, conflicts, peers, possibleCells, type Difficulty } from '../src/lib/sudoku.ts';
import { createGame, enter, undo, restore, isComplete } from '../src/lib/game.ts';
import { restorePreferences, DEFAULT_PREFS } from '../src/lib/preferences.ts';

const basicNotes = (values: number[]) => automaticNotes(getCandidates({ values }));

for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
  test(`${difficulty}: varied, valid, uniquely solvable puzzles`, () => {
    const boards = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) {
      const puzzle = generatePuzzle(difficulty, seed);
      assert.equal(puzzle.givens.length, 81);
      assert.equal(countSolutions(puzzle.givens), 1);
      assert.equal(conflicts(puzzle.solution).size, 0);
      assert.ok(puzzle.solution.every(n => n >= 1 && n <= 9));
      assert.ok(puzzle.givens.every((n, i) => n === 0 || n === puzzle.solution[i]));
      const clues = puzzle.givens.filter(Boolean).length;
      assert.ok(clues >= { easy: 42, medium: 34, hard: 28 }[difficulty]);
      assert.ok(clues <= { easy: 44, medium: 37, hard: 33 }[difficulty]);
      boards.add(puzzle.givens.join(''));
    }
    assert.equal(boards.size, 12);
  });
}
test('solver rejects invalid full boards and does not mutate its input', () => {
  assert.equal(countSolutions(Array(81).fill(1)), 0);
  const empty = Array(81).fill(0);
  assert.equal(countSolutions(empty), 2);
  assert.deepEqual(empty, Array(81).fill(0));
});
test('conflicts mark both duplicates and ignore empty cells', () => {
  const values = Array(81).fill(0); values[0] = 4; values[8] = 4;
  assert.deepEqual([...conflicts(values)].sort((a,b) => a-b), [0,8]);
  assert.equal(peers(0).length, 20);
});
test('givens are immutable, entries and notes undo without changing original state', () => {
  const game = createGame(generatePuzzle('easy', 19));
  const fixed = game.givens.findIndex(Boolean);
  assert.equal(enter(game, { index: fixed, value: 1 }), game);
  const index = game.givens.indexOf(0);
  const noted = enter(game, { index, value: 3, pencil: true });
  assert.deepEqual(noted.notes[index], [3]);
  assert.deepEqual(game.notes[index], []);
  const filled = enter(noted, { index, value: game.solution[index] });
  assert.deepEqual(filled.notes[index], []);
  assert.deepEqual(undo(filled).notes, noted.notes);
  assert.deepEqual(undo(noted).values, game.values);
});
test('entering a digit removes peer notes, and undo restores them', () => {
  let game = createGame(generatePuzzle('easy', 21));
  const index = game.givens.findIndex((n,i) => !n && peers(i).some(p => !game.givens[p]));
  const peer = peers(index).find(p => !game.givens[p])!;
  game = enter(game, { index: peer, value: 7, pencil: true });
  const filled = enter(game, { index, value: 7 });
  assert.deepEqual(filled.notes[peer], []);
  assert.deepEqual(undo(filled).notes[peer], [7]);
});
test('completion requires a solved board; invalid inputs are ignored', () => {
  const game = createGame(generatePuzzle('easy', 20));
  assert.equal(isComplete(game), false);
  assert.equal(isComplete({ ...game, values: [...game.solution] }), true);
  assert.equal(isComplete({ ...game, values: Array(81).fill(1) }), false);
  assert.equal(enter(game, { index: -1, value: 4 }), game);
  assert.equal(enter(game, { index: game.givens.indexOf(0), value: 10 }), game);
});
test('saved game validation handles corruption and preserves legitimate mistakes', () => {
  let game = createGame(generatePuzzle('medium', 5));
  game = enter(game, { index: game.givens.indexOf(0), value: 2 });
  assert.deepEqual(restore(JSON.stringify(game)), game);
  for (const bad of ['nope', 'null', '{}', JSON.stringify({ ...game, values: [1] }),
    JSON.stringify({ ...game, solution: Array(81).fill(1) }),
    JSON.stringify({ ...game, notes: Array(81).fill([10]) }),
    JSON.stringify({ ...game, history: [{ values: [], notes: [] }] }),
    JSON.stringify({ ...game, version: 999 })]) assert.equal(restore(bad), null);
});
test('corrupt preferences fall back without throwing or preventing game restoration', () => {
  for (const raw of ['{', 'null', '{}', '42', '{"theme":"nope"}', null]) {
    assert.deepEqual(restorePreferences(raw), DEFAULT_PREFS);
  }
  const prefs = { theme: 'dark', blockIncorrectAnswers: false, highlightPeers: false };
  assert.deepEqual(restorePreferences(JSON.stringify(prefs)), { ...prefs, smartHighlighting: false });
});

test('possible cells exclude the active digit’s row, column, box and occupied cells', () => {
  const values = Array(81).fill(0);
  values[0] = 5;
  values[40] = 7;
  const original = [...values];
  const result = possibleCells(values, 5);
  assert.equal(result.size, 59);
  for (const index of [0, 8, 72, 10, 40]) assert.equal(result.has(index), false);
  for (const index of [12, 28, 80]) assert.equal(result.has(index), true);
  assert.deepEqual(values, original);
  assert.equal(possibleCells(values, 7).has(12), true);
  assert.equal(possibleCells(values, 7).has(30), false);
});
test('possible cells need an active digit and exclude all filled cells', () => {
  const values = Array(81).fill(0);
  for (const digit of [0, -1, 10, 1.5, NaN]) assert.equal(possibleCells(values, digit).size, 0);
  assert.equal(possibleCells(values, 1).size, 81);
  assert.equal(possibleCells(generatePuzzle('easy', 1).solution, 1).size, 0);
});
test('possible cells follow current entries, ignore notes and restore after undo', () => {
  const game = createGame(generatePuzzle('easy', 19));
  const index = game.values.indexOf(0);
  const digit = game.solution[index];
  const original = possibleCells(game.values, digit);
  assert.ok(original.has(index));
  const noted = enter(game, { index, value: digit, pencil: true });
  assert.deepEqual(possibleCells(noted.values, digit), original);
  const filled = enter(noted, { index, value: digit });
  assert.equal(possibleCells(filled.values, digit).has(index), false);
  assert.deepEqual(possibleCells(undo(filled).values, digit), original);
  // Even a mistaken entry constrains possibilities using the visible board.
  const wrongDigit = digit % 9 + 1;
  const mistaken = enter(game, { index, value: wrongDigit });
  for (const peer of peers(index)) assert.equal(possibleCells(mistaken.values, wrongDigit).has(peer), false);
});
test('smart highlighting is opt-in and restored without resetting existing preferences', () => {
  assert.equal(DEFAULT_PREFS.smartHighlighting, false);
  const prefs = { theme: 'dark', blockIncorrectAnswers: false, highlightPeers: false };
  for (const smartHighlighting of [true, false]) {
    const saved = { ...prefs, smartHighlighting };
    assert.deepEqual(restorePreferences(JSON.stringify(saved)), { ...saved });
  }
  for (const smartHighlighting of [undefined, null, 'true', 1]) {
    assert.deepEqual(restorePreferences(JSON.stringify({ ...prefs, smartHighlighting })), { ...prefs, smartHighlighting: false });
  }
});

test('auto notes mark exactly one or two legal placements, never zero or three', () => {
  const values = Array(81).fill(0);
  values[3] = 5; values[15] = 5;
  const digitCells = () => basicNotes(values).slice(0, 27)
    .flatMap((notes, i) => notes.includes(5) ? [i] : []);
  assert.deepEqual(digitCells(), []); // Three legal cells: 18, 19, 20.
  values[18] = 1;
  assert.deepEqual(digitCells(), [19, 20]);
  values[19] = 2;
  assert.deepEqual(digitCells(), [20]);
  values[20] = 3;
  assert.deepEqual(digitCells(), []);
  values[20] = 5; // Digit already placed in this box.
  assert.deepEqual(digitCells(), []);
});

test('auto notes group each digit independently in all nine boxes without mutating values', () => {
  const solution = generatePuzzle('easy', 19).solution;
  const values = solution.map(n => n <= 2 ? 0 : n);
  const original = [...values];
  const notes = basicNotes(values);
  assert.equal(notes.length, 81);
  for (let i = 0; i < 81; i++) assert.deepEqual(notes[i], values[i] ? [] : [1, 2]);
  assert.deepEqual(values, original);
  assert.ok(basicNotes(Array(81).fill(0)).every(n => !n.length));
  assert.ok(basicNotes(solution).every(n => !n.length));
});

test('auto notes follow entry, erase and undo without changing manual notes or history', () => {
  const puzzle = generatePuzzle('easy', 19);
  const game = createGame({ ...puzzle, givens: Array(81).fill(0) });
  game.values[3] = 5; game.values[15] = 5;
  const noted = enter(game, { index: 19, value: 7, pencil: true });
  const saved = JSON.stringify(noted);
  assert.deepEqual(basicNotes(noted.values), basicNotes(game.values));
  const filled = enter(noted, { index: 18, value: 1 });
  assert.ok(basicNotes(filled.values)[19].includes(5));
  assert.deepEqual(filled.notes[19], [7]);
  const erased = enter(filled, { index: 18, value: 0 });
  assert.equal(basicNotes(erased.values)[19].includes(5), false);
  assert.deepEqual(basicNotes(undo(erased).values), basicNotes(filled.values));
  assert.deepEqual(basicNotes(undo(filled).values), basicNotes(noted.values));
  assert.equal(JSON.stringify(noted), saved);
});
