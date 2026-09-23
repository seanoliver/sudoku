import { test } from 'node:test';
import assert from 'node:assert/strict';
import { excludedCells } from '../src/lib/candidates.ts';
import { createGame, enter } from '../src/lib/game.ts';
import { generatePuzzle } from '../src/lib/sudoku.ts';

const blank = () => createGame({ ...generatePuzzle('hard', 19), givens: Array(81).fill(0) });

test('excluded legal cells are reported for the active digit only', () => {
  let game = enter(blank(), { index: 0, value: 5, exclude: true });
  assert.deepEqual([...excludedCells({ values: game.values, exclusions: game.exclusions, digit: 5 })], [0]);
  assert.equal(excludedCells({ values: game.values, exclusions: game.exclusions, digit: 4 }).size, 0);
  game = enter(game, { index: 0, value: 5, exclude: true });
  assert.equal(excludedCells({ values: game.values, exclusions: game.exclusions, digit: 5 }).size, 0);
});

test('cells blocked by placed numbers or filled themselves are not reported', () => {
  let game = enter(blank(), { index: 0, value: 5, exclude: true });
  game = enter(game, { index: 8, value: 5 });
  assert.equal(excludedCells({ values: game.values, exclusions: game.exclusions, digit: 5 }).size, 0);
  // enter() clears a cell's exclusions when a value is placed, so build the stale exclusion directly.
  const filled = enter(blank(), { index: 40, value: 7 });
  const exclusions = filled.exclusions.map((cell, i) => i === 40 ? [3] : cell);
  assert.equal(excludedCells({ values: filled.values, exclusions, digit: 3 }).size, 0);
});

test('invalid digits return an empty set', () => {
  const game = enter(blank(), { index: 0, value: 5, exclude: true });
  for (const digit of [0, -1, 10, NaN, 1.5]) assert.equal(excludedCells({ values: game.values, exclusions: game.exclusions, digit }).size, 0);
});
