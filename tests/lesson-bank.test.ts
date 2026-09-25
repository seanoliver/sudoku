import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LESSON_BANK } from '../src/lib/lesson-bank.ts';
import { hasLesson, LESSONS, lessonOf, practiceGame } from '../src/lib/lessons.ts';
import { getPlayableCandidates } from '../src/lib/candidates.ts';
import { findStep } from '../src/lib/steps.ts';

test('every lesson board has its technique as the easiest next move, and the move agrees with the solution', () => {
  for (const id of LESSONS) for (const [index, board] of LESSON_BANK[id].entries()) {
    assert.equal(board.lesson, id);
    const game = practiceGame(board, index);
    const step = findStep(game.values, getPlayableCandidates(game));
    assert.ok(step, `${id} #${index} has a move`);
    assert.equal(lessonOf(step), id, `${id} #${index}`);
    if (step.placement) assert.equal(game.solution[step.placement.cell], step.placement.digit);
    for (const { cell, digit } of step.eliminations) assert.notEqual(game.solution[cell], digit);
    if (id === 'pointing' || id === 'claiming') assert.equal(step.pattern.length, 2, 'pointing and claiming boards show pairs');
  }
});

test('lessons have an example and practice boards, and practice games start clean with every candidate noted', () => {
  for (const id of LESSONS) if (id !== 'hidden-quad') assert.ok(LESSON_BANK[id].length >= 4, id);
  assert.ok(LESSONS.filter(hasLesson).length >= 14);
  const game = practiceGame(LESSON_BANK.pointing[1], 1);
  assert.deepEqual(game.history, []);
  const candidates = getPlayableCandidates(game);
  assert.ok(game.values.every((v, i) => v || game.notes[i].length === candidates[i].size));
});
