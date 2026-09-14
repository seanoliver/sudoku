import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePuzzle, countSolutions, conflicts, peers, type Difficulty } from '../src/lib/sudoku.ts';
import { createGame, enter, undo, restore, isComplete } from '../src/lib/game.ts';
import { restorePreferences, DEFAULT_PREFS } from '../src/lib/preferences.ts';

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
  const prefs = { theme: 'dark', showConflicts: false, highlightPeers: false };
  assert.deepEqual(restorePreferences(JSON.stringify(prefs)), prefs);
});
