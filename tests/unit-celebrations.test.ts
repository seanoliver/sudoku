import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completedUnits, generatePuzzle } from '../src/lib/sudoku.ts';

const solution = generatePuzzle('hard', 19).solution;
const without = (cells: number[]) => solution.map((v, i) => cells.includes(i) ? 0 : v);
const summary = (units: ReturnType<typeof completedUnits>) => units.map(u => `${u.kind} ${u.number}`);

test('completing the last cell of a row reports only that row', () => {
  const before = without([0, 9]); // row 1 missing cell 0; column 1 also missing cell 9
  const after = before.map((v, i) => i === 0 ? solution[0] : v);
  assert.deepEqual(summary(completedUnits({ before, after, index: 0 })), ['row 1']);
});

test('one entry can complete a row, a column and a box together, with their cells', () => {
  const before = without([40]);
  const after = solution;
  const units = completedUnits({ before, after, index: 40 });
  assert.deepEqual(summary(units), ['row 5', 'column 5', 'box 5']);
  assert.deepEqual(units[0].cells, [36, 37, 38, 39, 40, 41, 42, 43, 44]);
  assert.deepEqual(units[2].cells, [30, 31, 32, 39, 40, 41, 48, 49, 50]);
});

test('duplicates, already complete units and erasing never count', () => {
  const before = without([0, 1]);
  const duplicate = before.map((v, i) => i === 0 ? solution[1] : v); // row 1 filled except cell 1
  const filledDup = duplicate.map((v, i) => i === 1 ? solution[1] : v); // nine cells, one digit twice
  assert.deepEqual(summary(completedUnits({ before: duplicate, after: filledDup, index: 1 })).includes('row 1'), false);
  assert.deepEqual(completedUnits({ before: solution, after: solution, index: 0 }), []);
  assert.deepEqual(completedUnits({ before: solution, after: without([0]), index: 0 }), []);
});
