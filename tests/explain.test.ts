import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explainStep, EXPLAIN_TEXT_LIMIT } from '../src/lib/explain.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';
import { createGame } from '../src/lib/game.ts';
import { applyHint, nextHint } from '../src/lib/hints.ts';
import { getPlayableCandidates } from '../src/lib/candidates.ts';
import type { Step } from '../src/lib/steps.ts';

/** The board just before the first step matching `want`, walking Expert seeds in order. */
function firstStep(want: (step: Step) => boolean, seeds = 400) {
  for (let seed = 1; seed <= seeds; seed++) {
    let game = createGame(createPuzzle('expert', seed));
    for (let guard = 0; guard < 120; guard++) {
      const hint = nextHint(game);
      if (hint.kind !== 'step') break;
      if (want(hint.step)) return { step: hint.step, values: game.values, candidates: getPlayableCandidates({ values: game.values, exclusions: game.exclusions }) };
      game = applyHint(game, hint.step);
    }
  }
  throw new Error('no such step');
}

test('a color wrap builds the chain link by link, then shows the clash and the move', () => {
  const { step, values, candidates } = firstStep(s => s.variant === 'wrap');
  const lines = explainStep(step, { values, candidates });
  const d = step.digits[0];
  const linkLines = lines.filter(line => line.links?.newest);
  assert.equal(linkLines.length, step.area.length - 1, 'one line per link in a spanning chain');
  assert.match(lines[0].text, new RegExp(`^Look only at the ${d}s\\. (Row|Column|Box) \\d has just two places for ${d}`));
  linkLines.forEach((line, k) => assert.equal(line.links!.pairs.length, k + 1));
  const clash = lines.at(-2)!;
  assert.deepEqual([...clash.focus!].sort(), [...step.conflict!].sort());
  assert.match(clash.text, /has two (gold|blue) cells, but it can hold only one/);
  const last = lines.at(-1)!;
  assert.deepEqual(last.strike, step.eliminations);
  assert.match(last.text, new RegExp(`^Cross ${d} out of every (gold|blue) cell\\. That makes every (gold|blue) cell a ${d}\\.$`));
});

test('a color trap ends by ringing the trapped cell in red', () => {
  const { step, values, candidates } = firstStep(s => s.variant === 'trap');
  const lines = explainStep(step, { values, candidates });
  const trapped = lines.at(-2)!;
  assert.deepEqual(trapped.target, [step.eliminations[0].cell]);
  assert.equal(trapped.focus!.length, 2);
  assert.deepEqual(lines.at(-1)!.strike, step.eliminations);
});

test('every coloring line keeps the chain colors it has revealed so far', () => {
  const { step, values, candidates } = firstStep(s => s.technique === 'coloring');
  const lines = explainStep(step, { values, candidates });
  let seen = 0;
  for (const line of lines) { const size = line.colored?.size ?? 0; assert.ok(size >= seen); seen = size; }
  assert.equal(seen, step.area.length);
  for (const line of lines) assert.ok(line.text.length <= EXPLAIN_TEXT_LIMIT, line.text);
});

test('a naked single rings one placed copy of each other digit, then places the digit', () => {
  const { step, values, candidates } = firstStep(s => s.technique === 'naked-single');
  const lines = explainStep(step, { values, candidates });
  assert.equal(lines.length, 2);
  assert.deepEqual([...lines[0].focus!].sort((a, b) => a - b), [step.placement!.cell, ...step.pattern].sort((a, b) => a - b));
  assert.match(lines[0].text, new RegExp(`^Every number but ${step.placement!.digit} is already in its row, column, or box`));
  assert.deepEqual(lines[1].ghost, step.placement);
});

test('a hidden single crosses the digit out of every other open cell in the house, then places it', () => {
  const { step, values, candidates } = firstStep(s => s.technique === 'hidden-single');
  const [first, last] = explainStep(step, { values, candidates });
  const others = step.area.filter(i => !values[i] && i !== step.placement!.cell);
  assert.deepEqual(first.house, step.area);
  assert.deepEqual(first.strike!.map(m => m.cell).sort((a, b) => a - b), others.sort((a, b) => a - b));
  assert.deepEqual(last.ghost, step.placement);
});

test('pointing names the box then the line; claiming names the line then the box', () => {
  for (const variant of ['pointing', 'claiming'] as const) {
    const { step, values, candidates } = firstStep(s => s.variant === variant);
    const [first, last] = explainStep(step, { values, candidates });
    assert.match(first.text, variant === 'pointing' ? /^In box \d, \d fits only in these cells\. They're all in (row|column) \d\.$/ : /^In (row|column) \d, \d fits only in these cells\. They're all in box \d\.$/);
    assert.deepEqual(first.house, step.area);
    assert.deepEqual(last.strike, step.eliminations);
  }
});

test('naked and hidden sets say which numbers are locked into which cells', () => {
  for (const variant of ['naked', 'hidden'] as const) {
    const { step, values, candidates } = firstStep(s => s.technique === 'pair' && s.variant === variant);
    const [first, last] = explainStep(step, { values, candidates });
    assert.deepEqual(first.focus, step.pattern);
    assert.ok(first.chips!.length && first.chips!.every(m => step.pattern.includes(m.cell) && step.digits.includes(m.digit)));
    assert.deepEqual(last.strike, step.eliminations);
  }
});
