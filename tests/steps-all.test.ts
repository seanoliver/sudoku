import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allSteps, applyStep, baseCandidates, findStep } from '../src/lib/steps.ts';
import { EXPERT_BANK } from '../src/lib/expert-bank.ts';

test('allSteps lists every instance of a technique, starting with the one findStep returns', () => {
  let many = 0;
  for (const entry of EXPERT_BANK.slice(0, 40)) {
    const values = [...entry].map(Number); const candidates = baseCandidates(values);
    for (let step = findStep(values, candidates); step; step = findStep(values, candidates)) {
      const all = allSteps(values, candidates, step.technique);
      assert.deepEqual(all[0], step);
      assert.ok(all.every(s => s.technique === step.technique));
      if (all.length > 1) many++;
      applyStep(values, candidates, step);
    }
  }
  assert.ok(many > 50, `boards often hold more than one instance (${many})`);
});
