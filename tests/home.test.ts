import { test } from 'node:test';
import assert from 'node:assert/strict';
import { homeState, nextLesson, percentFilled, savedSeconds } from '../src/lib/home.ts';
import { createGame } from '../src/lib/game.ts';
import { buildPuzzle } from '../src/lib/sudoku.ts';
import { LESSON_BANDS } from '../src/lib/lessons.ts';

const game = createGame(buildPuzzle({ difficulty: 'easy', seed: 3, clueTarget: 40 }));

test('home shows a first visit, a game in progress, or a finished game', () => {
  assert.equal(homeState(null), 'new');
  assert.equal(homeState(game), 'playing');
  assert.equal(homeState({ ...game, values: game.solution }), 'done');
});

test('percent filled counts only the cells the player filled', () => {
  assert.equal(percentFilled(game), 0);
  const open = game.givens.flatMap((v, i) => v ? [] : [i]);
  const half = open.slice(0, open.length / 2 | 0);
  assert.equal(percentFilled({ ...game, values: game.values.map((v, i) => half.includes(i) ? game.solution[i] : v) }), Math.round(half.length / open.length * 100));
  assert.equal(percentFilled({ ...game, values: game.solution }), 100);
});

test('the next lesson is the easiest one not yet learned', () => {
  const all = LESSON_BANDS.flatMap(b => b.lessons);
  assert.equal(nextLesson({}), all[0]);
  assert.equal(nextLesson({ [all[0]]: 'x', [all[1]]: 'x' }), all[2]);
  assert.equal(nextLesson(Object.fromEntries(all.map(id => [id, 'x']))), null);
});

test('the saved time belongs to this game only, and bad storage reads as none', () => {
  assert.equal(savedSeconds(JSON.stringify({ id: game.id, seconds: 754.6 }), game.id), 754);
  assert.equal(savedSeconds(JSON.stringify({ id: 'other', seconds: 12 }), game.id), null);
  assert.equal(savedSeconds('not json', game.id), null);
  assert.equal(savedSeconds(null, game.id), null);
});

test('solved games are counted once each, whatever their difficulty, and bad storage reads as none', async () => {
  const { readSolved, recordSolved } = await import('../src/lib/home.ts');
  assert.deepEqual(readSolved(null), []);
  assert.deepEqual(readSolved('nope'), []);
  assert.deepEqual(readSolved('{"ids":[1,"a"]}'), []);
  assert.deepEqual(readSolved('{"ids":["a"]}'), ['a']);
  assert.deepEqual(recordSolved(recordSolved([], 'easy-1'), 'easy-1'), ['easy-1']);
  assert.deepEqual(recordSolved(['easy-1'], 'hard-2'), ['easy-1', 'hard-2']);
});
