import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grade, LESSONS, lessonName, lessonOf, lessonTechnique, markLearned, readLearned, type LessonId } from '../src/lib/lessons.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';
import { createGame, enter, excludeCandidates, toggleNotes, type GameState } from '../src/lib/game.ts';
import { applyHint, nextHint } from '../src/lib/hints.ts';
import type { Step } from '../src/lib/steps.ts';

/** The game just before the first step matching `want`, walking Expert seeds in order. */
function before(want: (step: Step) => boolean, seeds = 2000): { game: GameState; step: Step } {
  for (let seed = 1; seed <= seeds; seed++) {
    let game = createGame(createPuzzle('expert', seed));
    for (let guard = 0; guard < 120; guard++) {
      const hint = nextHint(game);
      if (hint.kind !== 'step') break;
      if (want(hint.step)) return { game, step: hint.step };
      game = applyHint(game, hint.step);
    }
  }
  throw new Error('no such step');
}

test('every lesson has a name, a technique, and maps back from its steps', () => {
  for (const id of LESSONS) assert.ok(lessonName(id).length && lessonTechnique(id));
  const found = new Set<LessonId>();
  for (const id of ['naked-single', 'hidden-single', 'pointing', 'claiming', 'naked-pair', 'hidden-pair', 'x-wing', 'swordfish', 'xy-wing', 'color-wrap', 'color-trap'] as const) {
    const { step } = before(s => lessonOf(s) === id);
    assert.equal(lessonTechnique(lessonOf(step)), step.technique);
    found.add(lessonOf(step));
  }
  assert.equal(found.size, 11);
});

test('making the move grades as correct, for placements and eliminations', () => {
  for (const id of ['hidden-single', 'pointing', 'naked-pair'] as const) {
    const { game, step } = before(s => lessonOf(s) === id);
    assert.deepEqual(grade(id, game, applyHint(game, step)).correct, true, id);
  }
});

test('a wrong digit, an extra crossing-out, notes, or nothing at all is not the move', () => {
  const single = before(s => lessonOf(s) === 'hidden-single');
  const { cell, digit } = single.step.placement!;
  assert.equal(grade('hidden-single', single.game, enter(single.game, { index: cell, value: digit % 9 + 1 })).correct, false);
  assert.equal(grade('hidden-single', single.game, single.game).correct, false);
  const pointing = before(s => lessonOf(s) === 'pointing');
  const right = applyHint(pointing.game, pointing.step);
  const other = right.values.findIndex((v, i) => !v && !pointing.step.eliminations.some(e => e.cell === i) && pointing.game.exclusions[i].length < 8);
  const spare = [1, 2, 3, 4, 5, 6, 7, 8, 9].find(d => !right.exclusions[other].includes(d))!;
  assert.equal(grade('pointing', pointing.game, excludeCandidates(right, { eliminations: [{ cell: other, digit: spare }] })).correct, false);
  const noted = toggleNotes(pointing.game, { indices: pointing.step.eliminations.map(e => e.cell), value: pointing.step.digits[0] });
  assert.equal(grade('pointing', pointing.game, noted).correct, false);
  assert.deepEqual(grade('pointing', pointing.game, noted).step.eliminations.length > 0, true, 'a wrong answer still names a move to explain');
});

test('learned status survives bad storage and ignores unknown lessons', () => {
  assert.deepEqual(readLearned(null), {});
  assert.deepEqual(readLearned('not json'), {});
  assert.deepEqual(readLearned('{"pointing":"2026-09-25","made-up":"x","x-wing":3}'), { pointing: '2026-09-25' });
  assert.deepEqual(markLearned({}, 'x-wing', '2026-09-25'), { 'x-wing': '2026-09-25' });
});
