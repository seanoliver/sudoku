import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/lib/game.ts';
import { describeAction, announce } from '../src/lib/undo-description.ts';
import { generatePuzzle, peers } from '../src/lib/sudoku.ts';
const initial = () => engine.createGame(generatePuzzle('hard', 1));
const emptyCells = (game: engine.GameState) => game.values.flatMap((v, i) => v ? [] : [i]);

test('a number counts only the cell whose number changed, not peers whose notes were cleared', () => {
  const start = initial();
  const [cell] = emptyCells(start);
  const value = start.solution[cell];
  const noted = engine.toggleNotes(start, { indices: emptyCells(start).filter(i => peers(cell).includes(i)).slice(0, 3), value });
  const entered = engine.enter(noted, { index: cell, value });
  assert.deepEqual(describeAction(noted, entered), { kind: 'number', cells: [cell] });
});

test('notes, a note batch, and Fill notes are notes', () => {
  const start = initial();
  const [a, b, c] = emptyCells(start);
  assert.deepEqual(describeAction(start, engine.enter(start, { index: a, value: 4, pencil: true })), { kind: 'notes', cells: [a] });
  assert.deepEqual(describeAction(start, engine.toggleNotes(start, { indices: [a, b, c], value: 4 })), { kind: 'notes', cells: [a, b, c] });
  assert.equal(describeAction(start, engine.fillNotes(start))?.kind, 'notes');
});

test('an exclusion is an exclusion, including one that removes a note, and removing one', () => {
  const start = initial();
  const [a, b] = emptyCells(start);
  const noted = engine.toggleNotes(start, { indices: [a, b], value: 4 });
  const excluded = engine.toggleExclusions(noted, { indices: [a, b], value: 4 });
  assert.deepEqual(describeAction(noted, excluded), { kind: 'exclusion', cells: [a, b] });
  const cleared = engine.toggleExclusions(excluded, { indices: [a, b], value: 4 });
  assert.deepEqual(describeAction(excluded, cleared), { kind: 'exclusion', cells: [a, b] });
});

test('a note that replaces an exclusion is a note', () => {
  const start = initial();
  const [a] = emptyCells(start);
  const excluded = engine.enter(start, { index: a, value: 4, exclude: true });
  const noted = engine.enter(excluded, { index: a, value: 4, pencil: true });
  assert.deepEqual(describeAction(excluded, noted), { kind: 'notes', cells: [a] });
});

test('erasing a number is a number; no change describes nothing', () => {
  const start = initial();
  const [a] = emptyCells(start);
  const entered = engine.enter(start, { index: a, value: 3 });
  assert.deepEqual(describeAction(entered, engine.enter(entered, { index: a, value: 0 })), { kind: 'number', cells: [a] });
  assert.equal(describeAction(start, start), null);
});

test('Fill notes that only changes who owns matching notes is still notes', () => {
  const filled = engine.fillNotes(initial());
  const manual: engine.GameState = { ...filled, noteOrigins: filled.noteOrigins.map(origin => origin === 'generated' ? 'manual' : origin) };
  const refilled = engine.fillNotes(manual);
  assert.notEqual(refilled, manual);
  assert.deepEqual(refilled.notes, manual.notes);
  assert.deepEqual(describeAction(manual, refilled), { kind: 'notes', cells: emptyCells(manual) });
});

test('announcements name the direction, kind, and count', () => {
  assert.equal(announce({ direction: 'undo', action: { kind: 'notes', cells: [1, 2, 3, 4] } }), 'Undid notes in 4 cells');
  assert.equal(announce({ direction: 'redo', action: { kind: 'number', cells: [7] } }), 'Redid a number in 1 cell');
  assert.equal(announce({ direction: 'undo', action: { kind: 'number', cells: [7, 8] } }), 'Undid numbers in 2 cells');
  assert.equal(announce({ direction: 'undo', action: { kind: 'exclusion', cells: [7] } }), 'Undid an exclusion in 1 cell');
});
