import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPuzzle, ratePuzzle, solveWithTechniques, TECHNIQUES, DIFFICULTY_BANDS } from '../src/lib/difficulty.ts';
import { buildPuzzle, countSolutions, conflicts, generatePuzzle } from '../src/lib/sudoku.ts';

test('a solved board and a one-gap board need only naked singles', () => {
  const { solution } = generatePuzzle('easy', 3);
  assert.equal(ratePuzzle(solution), 'naked-single');
  assert.equal(ratePuzzle(solution.map((v, i) => i === 40 ? 0 : v)), 'naked-single');
});

test('ratings follow technique order and every generated easy puzzle needs only naked singles', () => {
  assert.deepEqual(TECHNIQUES, ['naked-single', 'hidden-single', 'locked-candidates', 'pair', 'triple', 'x-wing', 'beyond']);
  for (let seed = 1; seed <= 8; seed++) assert.equal(ratePuzzle(generatePuzzle('easy', seed).givens), 'naked-single');
});

for (const difficulty of ['easy', 'medium', 'hard'] as const) {
  test(`${difficulty}: graded puzzles land in their band, stay unique, and are deterministic`, () => {
    const boards = new Set<string>();
    for (let seed = 1; seed <= 6; seed++) {
      const puzzle = createPuzzle(difficulty, seed);
      assert.equal(puzzle.difficulty, difficulty);
      assert.equal(countSolutions(puzzle.givens), 1);
      assert.equal(conflicts(puzzle.solution).size, 0);
      assert.ok(puzzle.givens.every((n, i) => n === 0 || n === puzzle.solution[i]));
      assert.ok(DIFFICULTY_BANDS[difficulty].includes(ratePuzzle(puzzle.givens)), `${difficulty} seed ${seed} rated ${ratePuzzle(puzzle.givens)}`);
      assert.deepEqual(createPuzzle(difficulty, seed), puzzle);
      boards.add(puzzle.givens.join(''));
    }
    assert.equal(boards.size, 6);
  });
}

test('graded generation stays fast enough for the puzzle worker', () => {
  const start = performance.now();
  for (let seed = 100; seed < 110; seed++) createPuzzle('hard', seed);
  assert.ok((performance.now() - start) / 10 < 1500);
});

test('technique solving never contradicts the solution, including on the hardest puzzles', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const puzzle = buildPuzzle({ difficulty: 'hard', seed, clueTarget: 0 });
    const { technique, values } = solveWithTechniques(puzzle.givens);
    assert.ok(values.every((v, i) => v === 0 || v === puzzle.solution[i]), `seed ${seed} placed a wrong digit`);
    if (technique !== 'beyond') assert.deepEqual(values, puzzle.solution);
  }
});
