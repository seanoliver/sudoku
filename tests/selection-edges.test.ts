import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectionEdges } from '../src/lib/selection-edges.ts';

test('a single cell draws all four sides', () => {
  assert.deepEqual(selectionEdges([40]).get(40), ['top', 'right', 'bottom', 'left']);
});

test('two adjacent cells do not draw the side they share', () => {
  const edges = selectionEdges([40, 41]);
  assert.deepEqual(edges.get(40), ['top', 'bottom', 'left']);
  assert.deepEqual(edges.get(41), ['top', 'right', 'bottom']);
});

test('an L shape draws only its outer sides', () => {
  const edges = selectionEdges([19, 20, 21, 30]);
  assert.deepEqual(edges.get(19), ['top', 'bottom', 'left']);
  assert.deepEqual(edges.get(20), ['top', 'bottom']);
  assert.deepEqual(edges.get(21), ['top', 'right']);
  assert.deepEqual(edges.get(30), ['right', 'bottom', 'left']);
});

test('cells on opposite board edges are not neighbors', () => {
  const edges = selectionEdges([8, 9]);
  assert.deepEqual(edges.get(8), ['top', 'right', 'bottom', 'left']);
  assert.deepEqual(edges.get(9), ['top', 'right', 'bottom', 'left']);
});
