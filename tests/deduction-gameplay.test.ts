import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCandidates, automaticNotes } from '../src/lib/candidates.ts';
import { generatePuzzle } from '../src/lib/sudoku.ts';
import { createGame, enter } from '../src/lib/game.ts';

const pairs = { pointingPairs: true, hiddenPairs: true };
const all = { ...pairs, hiddenSingles: true };

// Characterization of the current unrestricted chaining policy, not a desired
// difficulty target. Revise these expectations deliberately during the gameplay
// spike; a change here should prompt review of how much reasoning remains.
test('gameplay baseline: unrestricted deductions fully reduce 86 of 100 fresh Hard puzzles', () => {
  const configurations = { none: {}, pairs, singles: { hiddenSingles: true }, all };
  const fullyReduced = { none: 0, pairs: 0, singles: 0, all: 0 };
  for (let seed = 1; seed <= 100; seed++) {
    const puzzle = generatePuzzle('hard', seed);
    const original = [...puzzle.givens];
    for (const name of Object.keys(configurations) as (keyof typeof configurations)[]) {
      const candidates = getCandidates({ values: puzzle.givens, deductions: configurations[name] });
      const empty = candidates.filter((_, i) => !puzzle.givens[i]);
      assert.ok(empty.length > 0);
      if (empty.every(cell => cell.size === 1)) fullyReduced[name]++;
    }
    assert.deepEqual(puzzle.givens, original, 'deductions must not place values');
  }
  assert.deepEqual(fullyReduced, { none: 0, pairs: 0, singles: 71, all: 86 });
});

test('gameplay baseline: filling a precomputed answer leaves no peer note changes to animate', () => {
  const puzzle = generatePuzzle('hard', 1);
  const game = createGame(puzzle);
  const candidates = getCandidates({ values: game.values, deductions: all });
  const before = automaticNotes(candidates);
  const index = game.values.findIndex(value => value === 0);
  assert.ok(index >= 0);
  for (let i = 0; i < 81; i++) {
    if (!game.values[i]) assert.deepEqual(before[i], [puzzle.solution[i]]);
  }
  const next = enter(game, { index, value: puzzle.solution[index] });
  assert.equal(next.values[index], puzzle.solution[index]);
  const after = automaticNotes(getCandidates({ values: next.values, deductions: all }));
  assert.deepEqual(after[index], []);
  for (let i = 0; i < 81; i++) {
    if (i !== index) assert.deepEqual(after[i], before[i], `unexpected note change at cell ${i}`);
  }
});
