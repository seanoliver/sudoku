import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, enter, rejectEntry } from '../src/lib/game.ts';
import { generatePuzzle } from '../src/lib/sudoku.ts';

const blank = () => createGame({ ...generatePuzzle('hard', 19), givens: Array(81).fill(0) });
const wrong = (game: ReturnType<typeof blank>, index: number) => game.solution[index] % 9 + 1;

test('answer rejection only applies to wrong value entry with blocking on', () => {
  const game = blank();
  const value = wrong(game, 0);
  assert.deepEqual(rejectEntry(game, { index: 0, value, blockIncorrectAnswers: true }), { kind: 'answer', sources: [], unit: null });
  assert.equal(rejectEntry(game, { index: 0, value, blockIncorrectAnswers: false }), null);
  assert.equal(rejectEntry(game, { index: 0, value: game.solution[0], blockIncorrectAnswers: true }), null);
  assert.equal(rejectEntry(game, { index: 0, value: 0, blockIncorrectAnswers: true }), null);
  assert.equal(rejectEntry(game, { index: 0, value, pencil: true, blockIncorrectAnswers: true }), null);
  assert.equal(rejectEntry(game, { index: 0, value, exclude: true, blockIncorrectAnswers: true }), null);
});

test('constraint rejection reports every peer holding the digit and the first unit', () => {
  let game = blank();
  game = enter(game, { index: 4, value: 7 });   // same row as 0
  game = enter(game, { index: 36, value: 7 });  // same column as 0
  assert.deepEqual(rejectEntry(game, { index: 0, value: 7, filterNumberKeys: true }), { kind: 'constraint', sources: [4, 36], unit: 'row' });
  assert.equal(rejectEntry(game, { index: 0, value: 7, filterNumberKeys: false }), null);
  const columnOnly = enter(blank(), { index: 36, value: 7 });
  assert.equal(rejectEntry(columnOnly, { index: 0, value: 7, filterNumberKeys: true })?.unit, 'column');
  const boxOnly = enter(blank(), { index: 10, value: 7 });
  assert.equal(rejectEntry(boxOnly, { index: 0, value: 7, filterNumberKeys: true })?.unit, 'box');
});

test('constraint takes precedence over answer, and givens are never rejected', () => {
  const game = enter(blank(), { index: 4, value: 7 });
  const both = rejectEntry(game, { index: 0, value: 7, filterNumberKeys: true, blockIncorrectAnswers: true });
  assert.equal(both?.kind, 'constraint');
  const puzzle = generatePuzzle('hard', 19);
  const given = puzzle.givens.findIndex(Boolean);
  assert.equal(rejectEntry(createGame(puzzle), { index: given, value: puzzle.givens[given] % 9 + 1, blockIncorrectAnswers: true }), null);
});

test('enter still refuses rejected entries without touching history', () => {
  const game = blank();
  assert.equal(enter(game, { index: 0, value: wrong(game, 0), blockIncorrectAnswers: true }), game);
});
