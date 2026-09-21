import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conflicts, countSolutions } from '../src/lib/sudoku.ts';
import { getCandidates } from '../src/lib/candidates.ts';

const board = (rows: string[]) => rows.join('').split('').map(Number);

// White clues and blue entries transcribed from the September 18 report.
const givens = board([
  '000008002', '004100000', '006020509',
  '407030090', '659000100', '000050000',
  '913067004', '005000901', '200000050',
]);
const entries = board([
  '591678432', '324195060', '876423519',
  '407832695', '659740123', '132956040',
  '913567284', '765384901', '248019356',
]);

test('reported screenshot has unique original clues but entries create dead ends without duplicates', () => {
  assert.equal(givens.filter(Boolean).length, 28);
  assert.ok(givens.every((n, i) => !n || entries[i] === n));
  assert.equal(countSolutions(givens), 1);
  assert.equal(conflicts(entries).size, 0);
  assert.equal(countSolutions(entries), 0);
  const candidates = getCandidates({ values: entries });
  assert.deepEqual(entries.flatMap((n, i) => !n && !candidates[i].size ? [i] : []), [28, 41, 70, 75]);
});
