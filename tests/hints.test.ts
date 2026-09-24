import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyStep, baseCandidates, findStep, TECHNIQUES } from '../src/lib/steps.ts';
import { applyHint, nextHint } from '../src/lib/hints.ts';
import { buildPuzzle } from '../src/lib/sudoku.ts';
import { EXPERT_BANK } from '../src/lib/expert-bank.ts';
import { createGame, enter, excludeCandidates, undo } from '../src/lib/game.ts';
import { solveWithTechniques } from '../src/lib/difficulty.ts';

/** Walks a puzzle move by move, checking every reported move against the solution. */
function walk(givens: number[], solution: number[], seen: Set<string>) {
  const values = [...givens]; const candidates = baseCandidates(values);
  for (let step = findStep(values, candidates); step; step = findStep(values, candidates)) {
    seen.add(step.technique);
    if (step.placement) assert.equal(solution[step.placement.cell], step.placement.digit, `${step.technique} placed a wrong digit`);
    for (const { cell, digit } of step.eliminations) assert.notEqual(solution[cell], digit, `${step.technique} eliminated the answer`);
    assert.ok(step.placement || step.eliminations.length, 'every step makes progress');
    assert.ok(step.area.length && step.digits.length);
    applyStep(values, candidates, step);
  }
}

test('every reported move agrees with the solution, across generated and expert puzzles', () => {
  const seen = new Set<string>();
  for (let seed = 1; seed <= 60; seed++) { const p = buildPuzzle({ difficulty: 'hard', seed, clueTarget: 0 }); walk(p.givens, p.solution, seen); }
  for (const entry of EXPERT_BANK.slice(0, 60)) { const givens = [...entry].map(Number); walk(givens, solveWithTechniques(givens).values, seen); }
  for (const technique of ['naked-single', 'hidden-single', 'locked-candidates', 'pair', 'xy-wing', 'coloring']) assert.ok(seen.has(technique), `never saw ${technique}`);
  assert.ok([...seen].every(t => TECHNIQUES.includes(t as never)));
});

test('a hint flags a wrong number before anything else', () => {
  const game = createGame(buildPuzzle({ difficulty: 'easy', seed: 4, clueTarget: 42 }));
  const cell = game.givens.findIndex(v => !v);
  const wrong = enter(game, { index: cell, value: game.solution[cell] % 9 + 1 });
  assert.deepEqual(nextHint(wrong), { kind: 'mistake', cell });
});

test('a hint gives the easiest move, and applying it is one undoable step', () => {
  const game = createGame(buildPuzzle({ difficulty: 'easy', seed: 4, clueTarget: 42 }));
  const hint = nextHint(game);
  assert.equal(hint.kind, 'step');
  if (hint.kind !== 'step') return;
  assert.equal(hint.step.technique, 'naked-single');
  const applied = applyHint(game, hint.step);
  assert.equal(applied.values[hint.step.placement!.cell], hint.step.placement!.digit);
  assert.equal(applied.history.length, game.history.length + 1);
  assert.deepEqual({ ...undo(applied), redoHistory: [] }, game);
});

test('elimination hints apply as exclusions and the next hint builds on correct exclusions only', () => {
  // Find a board state where the easiest move is an elimination.
  for (const entry of EXPERT_BANK) {
    const givens = [...entry].map(Number); const solution = solveWithTechniques(givens).values;
    let game = createGame({ id: 'x', difficulty: 'expert', givens, solution });
    for (let guard = 0; guard < 200; guard++) {
      const hint = nextHint(game);
      if (hint.kind !== 'step') break;
      if (!hint.step.placement) {
        const applied = applyHint(game, hint.step);
        for (const { cell, digit } of hint.step.eliminations) assert.ok(applied.exclusions[cell].includes(digit));
        assert.equal(applied.history.length, game.history.length + 1);
        const next = nextHint(applied);
        assert.ok(next.kind === 'step' && !(next.step.eliminations.length && next.step.eliminations.every(e => hint.step.eliminations.some(h => h.cell === e.cell && h.digit === e.digit))), 'applied exclusions advance the hint');
        // Excluding a cell's answer is reported as a mistake before any move.
        const cell = applied.values.findIndex(value => !value);
        const misled = { ...applied, exclusions: applied.exclusions.map((x, i) => i === cell ? [...x, solution[cell]] : x) };
        assert.deepEqual(nextHint(misled), { kind: 'mistake', cell, digit: solution[cell] });
        return;
      }
      game = applyHint(game, hint.step);
    }
  }
  assert.fail('no elimination hint found in the bank');
});

test('a solved board and a position beyond these techniques report distinctly', () => {
  const p = buildPuzzle({ difficulty: 'easy', seed: 4, clueTarget: 42 });
  assert.deepEqual(nextHint({ ...createGame(p), values: [...p.solution] }), { kind: 'solved' });
  // A puzzle these techniques cannot finish ends in 'stuck', never a guess.
  for (let seed = 1; seed <= 60; seed++) {
    const q = buildPuzzle({ difficulty: 'hard', seed, clueTarget: 0 });
    if (solveWithTechniques(q.givens).technique !== 'beyond') continue;
    let game = createGame(q);
    for (let hint = nextHint(game); hint.kind === 'step'; hint = nextHint(game)) game = applyHint(game, hint.step);
    assert.deepEqual(nextHint(game), { kind: 'stuck' });
    return;
  }
  assert.fail('no beyond puzzle in the sample');
});

test('single hints list the exclusions they rely on, so every ruled-out cell is explained', () => {
  const p = buildPuzzle({ difficulty: 'hard', seed: 5, clueTarget: 0 });
  let game = createGame(p);
  for (let guard = 0; guard < 300; guard++) {
    const hint = nextHint(game);
    if (hint.kind !== 'step') break;
    const { step } = hint;
    if (step.technique === 'hidden-single') {
      const others = step.area.filter(i => !game.values[i] && i !== step.placement!.cell);
      for (const i of others) assert.ok(step.pattern.some(b => game.values[b] === step.placement!.digit && [Math.floor(b / 9) === Math.floor(i / 9), b % 9 === i % 9, Math.floor(b / 27) * 3 + Math.floor(b % 9 / 3) === Math.floor(i / 27) * 3 + Math.floor(i % 9 / 3)].some(Boolean)) || step.relies.some(r => r.cell === i), `cell ${i} unexplained`);
    }
    game = applyHint(game, step);
  }
});

test('excludeCandidates records several exclusions as one step and skips no-ops', () => {
  const game = enter(createGame(buildPuzzle({ difficulty: 'easy', seed: 4, clueTarget: 42 })), { index: 0, value: 0 });
  const empty = game.values.findIndex(v => !v);
  const noted = enter(game, { index: empty, value: 3, pencil: true });
  const next = excludeCandidates(noted, { eliminations: [{ cell: empty, digit: 3 }, { cell: empty, digit: 3 }, { cell: empty, digit: 5 }, { cell: game.values.findIndex(Boolean), digit: 2 }] });
  assert.deepEqual(next.exclusions[empty], [3, 5]);
  assert.deepEqual(next.notes[empty], []);
  assert.equal(next.history.length, noted.history.length + 1);
  assert.equal(excludeCandidates(next, { eliminations: [{ cell: empty, digit: 3 }] }), next);
});
