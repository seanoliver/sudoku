import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explainStep, EXPLAIN_TEXT_LIMIT } from '../src/lib/explain.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';
import { createGame } from '../src/lib/game.ts';
import { applyHint, nextHint } from '../src/lib/hints.ts';
import { getPlayableCandidates } from '../src/lib/candidates.ts';
import { applyStep, baseCandidates, findStep, type Step } from '../src/lib/steps.ts';
import { EXPERT_BANK } from '../src/lib/expert-bank.ts';

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
  assert.match(last.text, new RegExp(`^Cross ${d} out of every (gold|blue) cell\\. That makes every (gold|blue) cell an? ${d}\\.$`));
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

test('a hidden single that relies on crossed-out cells says so instead of crediting placed digits', () => {
  const { step, values, candidates } = firstStep(s => s.technique === 'hidden-single' && s.relies.length > 0);
  const [first] = explainStep(step, { values, candidates });
  const d = step.placement!.digit;
  assert.match(first.text, new RegExp(`${d} is already crossed out of`));
  if (step.pattern.length) assert.match(first.text, new RegExp(`placed ${d}s`));
  else assert.doesNotMatch(first.text, /placed/);
});

test('an 8 reads as "an 8"', () => {
  const { step, values, candidates } = firstStep(s => s.technique === 'hidden-single' && s.placement!.digit === 8);
  assert.match(explainStep(step, { values, candidates })[0].text, /needs an 8\./);
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

test('a fish shows one base line at a time, then the covered lines, then the move', () => {
  for (const technique of ['x-wing', 'swordfish'] as const) {
    const { step, values, candidates } = firstStep(s => s.technique === technique, 2000);
    const lines = explainStep(step, { values, candidates });
    const size = step.fish!.base.length;
    assert.equal(lines.length, size + 2);
    for (let k = 0; k < size; k++) assert.match(lines[k].text, new RegExp(`^(Row|Column) \\d has ${step.digits[0]} only in (rows|columns) `));
    assert.deepEqual(lines.at(-1)!.strike, step.eliminations);
  }
});

test('an XY-wing walks the pivot, each case, then the shared digit', () => {
  const { step, values, candidates } = firstStep(s => s.technique === 'xy-wing');
  const lines = explainStep(step, { values, candidates });
  const { pivot, wings, pivotDigits: [p, q], shared } = step.xyWing!;
  assert.equal(lines.length, 4);
  assert.equal(lines[0].text, `This cell, the pivot, can only be ${Math.min(p, q)} or ${Math.max(p, q)}.`);
  assert.equal(lines[1].text, `If the pivot is ${p}, this wing can't be ${p} too, so it's ${shared}.`);
  assert.deepEqual(lines[1].focus, [pivot, wings[0]]);
  assert.equal(lines[2].text, `If the pivot is ${q}, this wing can't be ${q} too, so it's ${shared}.`);
  assert.deepEqual(lines[3].strike, step.eliminations);
});

test('every step across 150 bank puzzles has a walkthrough that ends on its move and fits the panel', () => {
  const seen = new Set<string>();
  for (const entry of EXPERT_BANK.slice(0, 150)) {
    const values = [...entry].map(Number); const candidates = baseCandidates(values);
    for (let step = findStep(values, candidates); step; step = findStep(values, candidates)) {
      seen.add(step.technique);
      const lines = explainStep(step, { values, candidates });
      assert.ok(lines.length >= 2, step.technique);
      for (const line of lines) {
        assert.ok(line.text.length && line.text.length <= EXPLAIN_TEXT_LIMIT, `${step.technique}: ${line.text}`);
        for (const cell of [...(line.focus ?? []), ...(line.target ?? []), ...(line.house ?? [])]) assert.ok(Number.isInteger(cell) && cell >= 0 && cell < 81, step.technique);
      }
      const last = lines.at(-1)!;
      if (step.placement) assert.deepEqual(last.ghost, step.placement);
      else assert.deepEqual(last.strike, step.eliminations);
      applyStep(values, candidates, step);
    }
  }
  assert.ok(seen.size >= 8, [...seen].join());
});
