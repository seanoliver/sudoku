import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hintView, techniqueName } from '../src/lib/hint-view.ts';
import type { Step } from '../src/lib/steps.ts';

const box0 = [0, 1, 2, 9, 10, 11, 18, 19, 20];
const hidden: Step = { technique: 'hidden-single', area: box0, pattern: [30, 60], digits: [6], placement: { cell: 10, digit: 6 }, eliminations: [], relies: [{ cell: 11, digit: 6 }] };
const pointing: Step = { technique: 'locked-candidates', variant: 'pointing', area: box0, pattern: [0, 1], digits: [4], eliminations: [{ cell: 5, digit: 4 }, { cell: 7, digit: 4 }], relies: [] };

test('technique names read the way solvers say them', () => {
  assert.equal(techniqueName(hidden), 'Hidden single');
  assert.equal(techniqueName(pointing), 'Pointing pair');
  assert.equal(techniqueName({ ...pointing, variant: 'claiming', pattern: [0, 1, 2] }), 'Claiming triple');
  assert.equal(techniqueName({ ...pointing, technique: 'pair', variant: 'naked' }), 'Naked pair');
  assert.equal(techniqueName({ ...pointing, technique: 'triple', variant: 'hidden' }), 'Hidden triple');
  assert.equal(techniqueName({ ...pointing, technique: 'xy-wing', variant: undefined }), 'XY-wing');
});

test('the strip names the deduction, then where to look, then names it again for the walkthrough', () => {
  const one = hintView({ kind: 'step', step: hidden }, 1);
  assert.equal(one.text, 'Hidden single');
  assert.equal(one.action, 'next');
  assert.equal(one.cells.size, 0);
  const two = hintView({ kind: 'step', step: hidden }, 2);
  assert.equal(two.text, 'Look in this box');
  assert.equal(two.label, 'Hidden single. Look in box 1');
  assert.deepEqual([...two.cells.keys()].sort((a, b) => a - b), box0);
  assert.ok([...two.cells.values()].every(set => set.has('area')));
  const three = hintView({ kind: 'step', step: hidden }, 3);
  assert.equal(three.text, 'Hidden single');
  assert.equal(three.action, 'apply');
  assert.equal(three.cells.size, 0, 'the walkthrough draws the board at level 3');
  for (const level of [1, 2, 3] as const) assert.ok(hintView({ kind: 'step', step: hidden }, level).text.length <= 20);
});

test('mistakes and dead ends have their own wording', () => {
  assert.equal(hintView({ kind: 'mistake', cell: 40 }, 1).text, 'Something’s off');
  assert.equal(hintView({ kind: 'mistake', cell: 40 }, 2).text, 'Check this cell');
  assert.ok(hintView({ kind: 'mistake', cell: 40 }, 2).cells.get(40)!.has('mistake'));
  assert.equal(hintView({ kind: 'mistake', cell: 40 }, 3).text, 'This number is wrong');
  assert.equal(hintView({ kind: 'mistake', cell: 40, digit: 7 }, 3).text, 'Don’t rule out 7');
  const stuck = hintView({ kind: 'stuck' }, 1);
  assert.equal(stuck.text, 'No hint here');
  assert.equal(stuck.action, 'none');
  assert.equal(stuck.levels, 1);
});

test('every hint line fits the strip', () => {
  const hints = [{ kind: 'step', step: hidden }, { kind: 'step', step: pointing }, { kind: 'mistake', cell: 1 }, { kind: 'mistake', cell: 1, digit: 7 }, { kind: 'stuck' }] as const;
  for (const hint of hints) for (const level of [1, 2, 3] as const) assert.ok(hintView(hint, level).text.length <= 20, hintView(hint, level).text);
});

test('a naked single underlines one placed copy of each other digit', async () => {
  const { baseCandidates, findStep } = await import('../src/lib/steps.ts');
  const { solution } = (await import('../src/lib/sudoku.ts')).generatePuzzle('easy', 3);
  const values = solution.map((v, i) => i === 40 ? 0 : v);
  const step = findStep(values, baseCandidates(values))!;
  assert.equal(step.technique, 'naked-single');
  assert.equal(step.pattern.length, 8);
  assert.deepEqual(new Set(step.pattern.map(i => values[i])).size, 8);
});
