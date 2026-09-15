import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/lib/candidates.ts';
import { generatePuzzle, possibleCells } from '../src/lib/sudoku.ts';
import { applyPointingPairs, applyHiddenPairs, type DeductionSettings } from '../src/lib/deductions.ts';
import { createGame, enter, undo } from '../src/lib/game.ts';

const both = { pointingPairs: true, hiddenPairs: true };

test('disabled deductions preserve the basic row, column and box possibilities', () => {
  const values = generatePuzzle('hard', 2).givens;
  const candidates = engine.getCandidates({ values });
  for (let digit = 1; digit <= 9; digit++) assert.deepEqual(engine.candidateCells(candidates, digit), possibleCells(values, digit));
  for (const digit of [0, -1, 10, NaN, 1.5]) assert.equal(engine.candidateCells(candidates, digit).size, 0);
});

test('pointing pairs update both display selectors and disabling restores possibilities', () => {
  const values = generatePuzzle('hard', 1).givens;
  const base = engine.getCandidates({ values });
  const reduced = engine.getCandidates({ values, deductions: { pointingPairs: true } });
  assert.ok(engine.candidateCells(base, 4).has(8));
  assert.equal(engine.candidateCells(reduced, 4).has(8), false);
  assert.ok(engine.automaticNotes(base)[8].includes(4));
  assert.equal(engine.automaticNotes(reduced)[8].includes(4), false);
  assert.equal(engine.automaticNotes(base)[11].includes(6), false);
  assert.ok(engine.automaticNotes(reduced)[11].includes(6));
  assert.deepEqual(engine.getCandidates({ values, deductions: { pointingPairs: false } }), base);
});

test('enabled deductions repeat until a hidden pair can reveal a later pointing pair', () => {
  const values = generatePuzzle('hard', 2).givens;
  const once = engine.getCandidates({ values });
  applyPointingPairs(once); applyHiddenPairs(once);
  assert.ok(once[30].has(6));
  const reduced = engine.getCandidates({ values, deductions: both });
  assert.equal(reduced[30].has(6), false);
  assert.equal(reduced[31].has(6), false);
  assert.equal(reduced[32].has(6), false);
  assert.equal(applyPointingPairs(reduced), false);
  assert.equal(applyHiddenPairs(reduced), false);
  const pointingOnly = engine.getCandidates({ values, deductions: { pointingPairs: true } });
  assert.ok(pointingOnly[38].has(6));
  const hiddenOnly = engine.getCandidates({ values, deductions: { hiddenPairs: true } });
  assert.ok(hiddenOnly[32].has(2));
});

test('deductions recompute on entry, erase and undo while manual notes remain independent', () => {
  const puzzle = generatePuzzle('hard', 2);
  const game = createGame({ ...puzzle, givens: Array(81).fill(0) });
  game.values[0] = 1; game.values[1] = 2; game.values[2] = 3;
  game.values[9] = 4; game.values[10] = 6; game.values[11] = 7;
  const before = engine.getCandidates({ values: game.values, deductions: both });
  const noted = enter(game, { index: 19, value: 7, pencil: true });
  assert.deepEqual(engine.getCandidates({ values: noted.values, deductions: both }), before);
  assert.ok(before[22].has(5));
  const filled = enter(noted, { index: 18, value: 8 });
  assert.equal(engine.getCandidates({ values: filled.values, deductions: both })[22].has(5), false);
  assert.deepEqual(engine.getCandidates({ values: undo(filled).values, deductions: both }), before);
  const erased = enter(filled, { index: 18, value: 0 });
  assert.deepEqual(engine.getCandidates({ values: erased.values, deductions: both }), before);
  assert.deepEqual(erased.notes[19], [7]);
});

test('contradictory entries fall back to basic candidates', () => {
  const duplicate = Array(81).fill(0); duplicate[0] = 1; duplicate[1] = 1;
  const impossible = [0,1,2,3,4,5,6,7,8, 9,...Array(71).fill(0)];
  for (const values of [duplicate, impossible]) {
    assert.deepEqual(engine.getCandidates({ values, deductions: both }), engine.getCandidates({ values }));
  }
});

test('all enabled-rule combinations preserve solution candidates across generated puzzles', () => {
  const configurations: Partial<DeductionSettings>[] = [{}, { pointingPairs: true }, { hiddenPairs: true }, both]
    .flatMap(deductions => [deductions, { ...deductions, hiddenSingles: true }]);
  for (const difficulty of ['easy', 'medium', 'hard'] as const) for (let seed = 1; seed <= 20; seed++) {
    const puzzle = generatePuzzle(difficulty, seed);
    const original = [...puzzle.givens];
    for (const deductions of configurations) {
      const candidates = engine.getCandidates({ values: puzzle.givens, deductions });
      for (let i = 0; i < 81; i++) {
        if (puzzle.givens[i]) assert.equal(candidates[i].size, 0);
        else assert.ok(candidates[i].has(puzzle.solution[i]), `${difficulty}/${seed}: lost solution at ${i}`);
      }
    }
    assert.deepEqual(puzzle.givens, original);
  }
});

test('contradictions exposed by deductions restore the basic candidates', () => {
  const values = generatePuzzle('hard', 1).givens;
  values[30] = 2;
  const basic = engine.getCandidates({ values });
  assert.ok(values.every((value, i) => value || basic[i].size > 0));
  const attempted = basic.map(cell => new Set(cell));
  applyPointingPairs(attempted); applyHiddenPairs(attempted);
  assert.notDeepEqual(attempted, basic);
  assert.deepEqual(engine.getCandidates({ values, deductions: both }), basic);
});

test('screenshot hidden single at row 6 column 1 removes green 4s from its row and column', () => {
  const values = [
    0,0,9,0,8,0,6,2,0,
    0,7,8,0,2,0,0,0,0,
    6,0,0,0,0,4,3,8,0,
    7,2,3,0,0,0,0,5,0,
    0,0,6,0,0,0,0,3,0,
    0,8,5,0,0,0,1,0,9,
    0,0,1,0,0,0,0,0,6,
    8,3,0,0,0,6,9,0,0,
    0,0,7,0,1,0,8,0,0,
  ];
  const original = [...values];
  const before = engine.getCandidates({ values, deductions: both });
  assert.deepEqual([...before[45]], [4]);
  const after = engine.getCandidates({ values, deductions: { ...both, hiddenSingles: true } });
  for (const i of [0,9,54,72,48,49,52]) {
    assert.ok(engine.candidateCells(before, 4).has(i));
    assert.equal(engine.candidateCells(after, 4).has(i), false, `4 should be removed at ${i}`);
    assert.equal(engine.automaticNotes(after)[i].includes(4), false);
  }
  assert.deepEqual([...after[45]], [4]);
  assert.ok(engine.candidateCells(after, 4).has(45));
  assert.ok(engine.automaticNotes(after)[45].includes(4));
  assert.deepEqual(values, original);
  assert.deepEqual(engine.getCandidates({ values, deductions: { ...both, hiddenSingles: false } }), before);
});
