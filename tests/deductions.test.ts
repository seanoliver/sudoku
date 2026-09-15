import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as rules from '../src/lib/deductions.ts';

const digits = [1,2,3,4,5,6,7,8,9];
const fresh = () => Array.from({ length: 81 }, () => new Set(digits));
const topLeft = [0,1,2,9,10,11,18,19,20];

for (const cells of [[0,1], [0,9]]) {
  test(`pointing pair ${cells} removes only the same digit outside its box on the shared line`, () => {
    const candidates = fresh();
    for (const i of topLeft) if (!cells.includes(i)) candidates[i].delete(5);
    assert.equal(rules.applyPointingPairs(candidates), true);
    const line = cells[1] === 1 ? [0,1,2,3,4,5,6,7,8] : [0,9,18,27,36,45,54,63,72];
    for (let i = 0; i < 81; i++) {
      assert.equal(candidates[i].has(5), topLeft.includes(i) ? cells.includes(i) : !line.includes(i));
      assert.ok(candidates[i].has(4));
    }
  });
}

test('pointing pairs exclude diagonal cells, triples, and singletons', () => {
  for (const cells of [[0,10], [0,1,2], [0]]) {
    const candidates = fresh();
    for (const i of topLeft) if (!cells.includes(i)) candidates[i].delete(5);
    const before = candidates.map(n => [...n]);
    assert.equal(rules.applyPointingPairs(candidates), false);
    assert.deepEqual(candidates.map(n => [...n]), before);
  }
});

for (const house of [[0,1,2,3,4,5,6,7,8], [0,9,18,27,36,45,54,63,72], topLeft]) {
  test(`hidden pair in house ${house} reserves exactly its two cells`, () => {
    const candidates = fresh();
    const pair = [house[0], house[4]];
    for (const i of house) if (!pair.includes(i)) { candidates[i].delete(3); candidates[i].delete(7); }
    const before = candidates.map(n => [...n]);
    assert.equal(rules.applyHiddenPairs(candidates), true);
    for (let i = 0; i < 81; i++) assert.deepEqual([...candidates[i]], pair.includes(i) ? [3,7] : before[i]);
  });
}

test('hidden pairs require both digits to have the same two placements', () => {
  const candidates = fresh();
  for (let i = 2; i < 9; i++) candidates[i].delete(3);
  for (let i = 3; i < 9; i++) candidates[i].delete(7);
  const before = candidates.map(n => [...n]);
  assert.equal(rules.applyHiddenPairs(candidates), false);
  assert.deepEqual(candidates.map(n => [...n]), before);
});
