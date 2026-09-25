import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyStep, baseCandidates, findStep, sees, type Step } from '../src/lib/steps.ts';
import { EXPERT_BANK } from '../src/lib/expert-bank.ts';
import { COLUMNS, ROWS, type Candidates } from '../src/lib/deductions.ts';

/** Every step the solver takes across the first 120 bank puzzles, with the candidates it saw. */
function bankSteps() {
  const out: { step: Step; candidates: Candidates }[] = [];
  for (const entry of EXPERT_BANK.slice(0, 120)) {
    const values = [...entry].map(Number); const candidates = baseCandidates(values);
    for (let step = findStep(values, candidates); step; step = findStep(values, candidates)) {
      out.push({ step, candidates: candidates.map(set => new Set(set)) });
      applyStep(values, candidates, step);
    }
  }
  return out;
}
const steps = bankSteps();

test('fish report their base and cover lines', () => {
  const fish = steps.filter(({ step }) => step.technique === 'x-wing' || step.technique === 'swordfish');
  assert.ok(fish.length);
  for (const { step, candidates } of fish) {
    const { rows, base, cover } = step.fish!;
    assert.equal(base.length, step.technique === 'x-wing' ? 2 : 3);
    assert.equal(cover.length, base.length);
    const [baseLines, crossLines] = rows ? [ROWS, COLUMNS] : [COLUMNS, ROWS];
    for (const b of base) for (const i of baseLines[b]) if (candidates[i].has(step.digits[0])) assert.ok(cover.some(c => crossLines[c].includes(i)));
    for (const { cell } of step.eliminations) assert.ok(cover.some(c => crossLines[c].includes(cell)) && !base.some(b => baseLines[b].includes(cell)));
  }
});

test('an XY-wing reports its pivot, which wing pairs with which pivot digit, and the shared digit', () => {
  const wings = steps.filter(({ step }) => step.technique === 'xy-wing');
  assert.ok(wings.length);
  for (const { step, candidates } of wings) {
    const { pivot, wings: [x, y], pivotDigits: [p, q], shared } = step.xyWing!;
    assert.deepEqual([...candidates[pivot]].sort(), [p, q].sort());
    assert.deepEqual([...candidates[x]].sort(), [p, shared].sort());
    assert.deepEqual([...candidates[y]].sort(), [q, shared].sort());
    assert.ok(sees(pivot, x) && sees(pivot, y));
    assert.ok(step.eliminations.every(e => e.digit === shared && sees(e.cell, x) && sees(e.cell, y)));
  }
});

test('coloring says whether it is a wrap or a trap, and a wrap names its two clashing cells', () => {
  const coloring = steps.filter(({ step }) => step.technique === 'coloring');
  assert.ok(coloring.some(({ step }) => step.variant === 'wrap') && coloring.some(({ step }) => step.variant === 'trap'));
  for (const { step } of coloring) {
    if (step.variant === 'trap') { assert.equal(step.conflict, undefined); continue; }
    const [x, y] = step.conflict!;
    const shade = step.shades!.find(s => s.includes(x))!;
    assert.ok(shade.includes(y) && sees(x, y));
    assert.ok(step.eliminations.every(e => shade.includes(e.cell)));
  }
});
