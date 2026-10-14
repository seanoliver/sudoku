import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fillOrder } from '../src/lib/solve-map.ts';
import type { Replay } from '../src/lib/replay.ts';

// Three open cells (0, 1, 2); the rest are starting numbers.
const givens = [0, 0, 0, ...Array(78).fill(5)];
const solution = [1, 2, 3, ...Array(78).fill(5)];
const replay = (steps: Replay['steps'], start: Replay['start'] = []): Replay => ({ id: 'g', start, steps });

test('cells rank by the step that gave them their answer', () => {
  const order = fillOrder({ givens, solution, replay: replay([[[2, 3, 0, 0]], [[0, 1, 0, 0]], [[1, 2, 0, 0]]]) });
  assert.deepEqual(order.slice(0, 3), [0.5, 1, 0]);
  assert.ok(order.slice(3).every(rank => rank === null));
});

test('a fixed cell counts from its right answer, and notes do not move it', () => {
  const order = fillOrder({ givens, solution, replay: replay([[[0, 9, 0, 0]], [[1, 2, 0, 0]], [[2, 3, 0, 0]], [[0, 1, 0, 0]], [[1, 2, 6, 0]]]) });
  assert.deepEqual(order.slice(0, 3), [1, 0, 0.5]);
});

test('a cell already right when recording began comes first', () => {
  const order = fillOrder({ givens, solution, replay: replay([[[1, 2, 0, 0]], [[2, 3, 0, 0]]], [[0, 1, 0, 0]]) });
  assert.deepEqual(order.slice(0, 3), [0, 0.5, 1]);
});

test('cells right when recording began rank before any step, in board order', () => {
  const order = fillOrder({ givens, solution, replay: replay([[[1, 2, 0, 0]]], [[2, 3, 0, 0], [0, 1, 0, 0]]) });
  assert.deepEqual(order.slice(0, 3), [0, 1, 0.5]);
});

test('a lone open cell is the last one filled', () => {
  const lone = [0, ...Array(80).fill(5)], answer = [1, ...Array(80).fill(5)];
  assert.deepEqual(fillOrder({ givens: lone, solution: answer, replay: replay([[[0, 1, 0, 0]]]) })[0], 1);
});

test('a replay that ends on a wrong number shades every open cell the same', () => {
  const order = fillOrder({ givens, solution, replay: replay([[[0, 1, 0, 0]], [[1, 2, 0, 0]], [[2, 3, 0, 0]], [[1, 9, 0, 0]]]) });
  assert.deepEqual(order.slice(0, 3), [0.5, 0.5, 0.5]);
});

test('without a full replay every open cell is shaded the same', () => {
  assert.deepEqual(fillOrder({ givens, solution }).slice(0, 4), [0.5, 0.5, 0.5, null]);
  assert.deepEqual(fillOrder({ givens, solution, replay: replay([[[0, 1, 0, 0]]]) }).slice(0, 3), [0.5, 0.5, 0.5]);
});
