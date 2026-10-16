import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/lib/game.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';
import { describeAction } from '../src/lib/undo-description.ts';
import { peers } from '../src/lib/sudoku.ts';

const start = engine.createGame(createPuzzle('easy', 7));
const empty = start.givens.flatMap((n, i) => n ? [] : [i]);
const given = start.givens.findIndex(Boolean);
const [a, b] = empty;
const noted = engine.enter(start, { index: a, value: 4, pencil: true });

test('a new game has no bold notes', () => {
  assert.equal(start.bold.length, 81);
  assert.ok(start.bold.every(cell => cell.length === 0));
});

test('bolding a note keeps it, and bolding it again makes it plain', () => {
  const bold = engine.toggleBold(noted, { indices: [a], value: 4 });
  assert.deepEqual(bold.bold[a], [4]);
  assert.deepEqual(bold.notes[a], [4]);
  const plain = engine.toggleBold(bold, { indices: [a], value: 4 });
  assert.deepEqual(plain.bold[a], []);
  assert.deepEqual(plain.notes[a], [4]);
});

test('bolding a missing note adds it bold and clears its exclusion', () => {
  const excluded = engine.enter(start, { index: a, value: 4, exclude: true });
  const bold = engine.toggleBold(excluded, { indices: [a], value: 4 });
  assert.deepEqual(bold.notes[a], [4]);
  assert.deepEqual(bold.exclusions[a], []);
  assert.deepEqual(bold.bold[a], [4]);
  assert.equal(bold.noteOrigins[a], 'manual');
});

test('a batch bolds every cell, and makes them plain only when all are already bold', () => {
  const one = engine.toggleBold(noted, { indices: [a], value: 4 });
  const both = engine.toggleBold(one, { indices: [a, b], value: 4 });
  assert.deepEqual([both.bold[a], both.bold[b]], [[4], [4]]);
  const plain = engine.toggleBold(both, { indices: [a, b], value: 4 });
  assert.deepEqual([plain.bold[a], plain.bold[b]], [[], []]);
});

test('givens and filled cells are never bolded', () => {
  assert.equal(engine.toggleBold(start, { indices: [given], value: 1 }), start);
  const filled = engine.enter(start, { index: a, value: start.solution[a] });
  assert.equal(engine.toggleBold(filled, { indices: [a], value: 1 }), filled);
});

test('a note that goes away takes its bold with it', () => {
  const bold = engine.toggleBold(noted, { indices: [a], value: 4 });
  assert.deepEqual(engine.enter(bold, { index: a, value: 4, pencil: true }).bold[a], []);
  assert.deepEqual(engine.enter(bold, { index: a, value: 4, exclude: true }).bold[a], []);
  const placed = engine.enter(bold, { index: a, value: start.solution[a] });
  assert.deepEqual(placed.bold[a], []);
  const peer = peers(a).find(p => !start.givens[p])!;
  const peerBold = engine.toggleBold(start, { indices: [peer], value: start.solution[a] });
  assert.deepEqual(engine.enter(peerBold, { index: a, value: start.solution[a] }).bold[peer], []);
});

test('Fill notes keeps bold on the notes it keeps', () => {
  const candidate = engine.fillNotes(start).notes[a][0];
  const bold = engine.toggleBold(start, { indices: [a], value: candidate });
  const filled = engine.fillNotes(bold);
  assert.deepEqual(filled.bold[a], [candidate]);
});

test('bold is one undo step, and undo and redo restore it', () => {
  const bold = engine.toggleBold(noted, { indices: [a], value: 4 });
  assert.equal(bold.history.length, noted.history.length + 1);
  assert.deepEqual(engine.undo(bold).bold[a], []);
  assert.deepEqual(engine.redo(engine.undo(bold)).bold[a], [4]);
  assert.deepEqual(describeAction(noted, bold), { kind: 'notes', cells: [a] });
});

test('bold survives a save, and older saves without it restore with none', () => {
  const bold = engine.toggleBold(noted, { indices: [a], value: 4 });
  assert.deepEqual(engine.restore(JSON.stringify(bold))?.bold[a], [4]);
  const legacy = JSON.parse(JSON.stringify(bold));
  delete legacy.bold;
  for (const snapshot of legacy.history) delete snapshot.bold;
  const restored = engine.restore(JSON.stringify(legacy));
  assert.ok(restored?.bold.every(cell => cell.length === 0));
});

test('a save with a bold digit that is not a note is refused', () => {
  const broken = { ...noted, bold: noted.bold.map((cell, i) => i === a ? [5] : cell) };
  assert.equal(engine.restore(JSON.stringify(broken)), null);
});

test('restart clears bold', () => {
  const bold = engine.toggleBold(noted, { indices: [a], value: 4 });
  assert.ok(engine.restartGame(bold).bold.every(cell => cell.length === 0));
});
