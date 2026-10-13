import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/lib/game.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';
import { announce, describeAction } from '../src/lib/undo-description.ts';

const start = engine.createGame(createPuzzle('easy', 7));
const empty = start.givens.flatMap((n, i) => n ? [] : [i]);
const given = start.givens.findIndex(Boolean);
const [a, b, c] = empty;

test('a new game has no colors', () => {
  assert.equal(start.colors.length, 81);
  assert.ok(start.colors.every(color => color === 0));
});

test('painting colors cells, and painting them the same color again clears them', () => {
  const gold = engine.paintCells(start, { indices: [a, b], color: 1 });
  assert.deepEqual([gold.colors[a], gold.colors[b], gold.colors[c]], [1, 1, 0]);
  const cleared = engine.paintCells(gold, { indices: [a, b], color: 1 });
  assert.deepEqual([cleared.colors[a], cleared.colors[b]], [0, 0]);
  const mixed = engine.paintCells(engine.paintCells(start, { indices: [a], color: 2 }), { indices: [a, b], color: 1 });
  assert.deepEqual([mixed.colors[a], mixed.colors[b]], [1, 1]);
});

test('color 0 clears, and a change that changes nothing leaves the game and its history alone', () => {
  const blue = engine.paintCells(start, { indices: [a], color: 2 });
  assert.equal(engine.paintCells(blue, { indices: [a], color: 0 }).colors[a], 0);
  assert.equal(engine.paintCells(start, { indices: [a], color: 0 }), start);
  assert.equal(engine.paintCells(start, { indices: [given], color: 1 }), start);
  assert.equal(engine.clearColors(start), start);
});

test('givens are never colored', () => {
  const painted = engine.paintCells(start, { indices: [given, a], color: 1 });
  assert.deepEqual([painted.colors[given], painted.colors[a]], [0, 1]);
});

test('Clear all clears every color as one undo step', () => {
  const painted = engine.paintCells(engine.paintCells(start, { indices: [a], color: 1 }), { indices: [b], color: 2 });
  const cleared = engine.clearColors(painted);
  assert.ok(cleared.colors.every(color => color === 0));
  assert.deepEqual(engine.undo(cleared).colors, painted.colors);
});

test('undo and redo cover colors, and entering a number keeps the color', () => {
  const painted = engine.paintCells(start, { indices: [a], color: 1 });
  assert.equal(engine.undo(painted).colors[a], 0);
  assert.equal(engine.redo(engine.undo(painted)).colors[a], 1);
  const entered = engine.enter(painted, { index: a, value: start.solution[a] });
  assert.equal(entered.colors[a], 1);
  assert.equal(engine.enter(entered, { index: a, value: 0 }).colors[a], 1);
});

test('restart clears colors', () => {
  assert.ok(engine.restartGame(engine.paintCells(start, { indices: [a], color: 1 })).colors.every(color => color === 0));
});

test('a color change is described and announced as colors', () => {
  const painted = engine.paintCells(start, { indices: [a, b], color: 2 });
  const action = describeAction(start, painted);
  assert.deepEqual(action, { kind: 'colors', cells: [a, b].sort((x, y) => x - y) });
  assert.equal(announce({ direction: 'undo', action: action! }), 'Undid colors in 2 cells');
});

test('colors are saved and restored, including in history', () => {
  const painted = engine.paintCells(engine.paintCells(start, { indices: [a], color: 1 }), { indices: [b], color: 2 });
  const restored = engine.restore(JSON.stringify(painted))!;
  assert.deepEqual(restored.colors, painted.colors);
  assert.deepEqual(restored.history.at(-1)!.colors, painted.history.at(-1)!.colors);
});

test('a game saved before colors existed loads with none', () => {
  const legacy = JSON.parse(JSON.stringify(engine.enter(start, { index: a, value: 3, pencil: true })));
  delete legacy.colors;
  for (const snapshot of legacy.history) delete snapshot.colors;
  const restored = engine.restore(JSON.stringify(legacy))!;
  assert.ok(restored.colors.every(color => color === 0));
  assert.ok(restored.history[0].colors.every(color => color === 0));
});

test('bad colors are rejected', () => {
  for (const colors of [[], Array(81).fill(3), Array(81).fill('gold'), null]) assert.equal(engine.restore(JSON.stringify({ ...start, colors })), null);
  const onGiven = [...start.colors]; onGiven[given] = 1;
  assert.equal(engine.restore(JSON.stringify({ ...start, colors: onGiven })), null);
});

test('a finished board takes no colors and keeps the ones it has', () => {
  const painted = engine.paintCells(start, { indices: [a], color: 1 });
  const done = { ...painted, values: [...start.solution], notes: start.notes.map(() => []), exclusions: start.exclusions.map(() => []) };
  assert.equal(engine.paintCells(done, { indices: [b], color: 2 }), done);
  assert.equal(engine.clearColors(done), done);
});
