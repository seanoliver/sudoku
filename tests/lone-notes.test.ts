import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/lib/game.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';
import { getEntryDigits, peers } from '../src/lib/sudoku.ts';

const start = engine.createGame(createPuzzle('easy', 7));
const entry = (i: number) => getEntryDigits({ values: start.values, index: i });
const empty = start.values.flatMap((v, i) => v ? [] : [i]);
const single = empty.find(i => entry(i).length === 1)!;
const stale = peers(single).map(p => start.values[p]).find(Boolean)!;
const open = empty.find(i => entry(i).length > 1 && !peers(i).includes(single))!;
const note = (game: engine.GameState, index: number, value: number) => engine.enter(game, { index, value, pencil: true });

test('removing the second-to-last note fills the cell when the placed numbers prove the last one', () => {
  const twoNotes = note(note(start, single, start.solution[single]), single, stale);
  const removed = note(twoNotes, single, stale);
  const { game, cells } = engine.fillLoneNotes(removed);
  assert.deepEqual(cells, [single]);
  assert.equal(game.values[single], start.solution[single]);
  assert.deepEqual(game.notes[single], []);
  assert.equal(game.noteOrigins[single], null);
  assert.equal(game.history.length, removed.history.length, 'the fill joins the note edit in one undo step');
  assert.deepEqual(engine.undo(game).notes[single], [stale, start.solution[single]].sort());
  assert.equal(engine.undo(game).values[single], 0);
});

test('a lone note is not filled while other digits still fit the cell', () => {
  const digit = entry(open)[0];
  const next = note(start, open, digit);
  assert.deepEqual(engine.fillLoneNotes(next), { game: next, cells: [] });
});

test('exclusions are not evidence', () => {
  const [keep, ...rest] = entry(open);
  let next = note(start, open, keep);
  for (const digit of rest) next = engine.enter(next, { index: open, value: digit, exclude: true });
  assert.deepEqual(engine.loneNoteCells(next), []);
  assert.deepEqual(engine.fillLoneNotes(next).cells, []);
});

test('a proven lone note you wrote fills on your next entry, wherever that entry is', () => {
  const proven = note(start, single, start.solution[single]);
  const unrelated = note(proven, open, entry(open)[0]);
  assert.deepEqual(engine.fillLoneNotes(unrelated).cells, [single]);
});

test('lone notes from Fill notes stay notes until you edit that cell', () => {
  const noted = engine.fillNotes(start);
  assert.ok(engine.loneNoteCells(noted).includes(single));
  assert.deepEqual(engine.fillLoneNotes(noted).cells, []);
  const edited = note(note(noted, single, start.solution[single]), single, start.solution[single]);
  assert.equal(edited.noteOrigins[single], 'manual');
  assert.ok(engine.fillLoneNotes(edited).cells.includes(single));
});

test('a fill clears its digit from peer notes, exclusions and bold, and fills only the cells the action proved', () => {
  const digit = start.solution[single];
  const peer = peers(single).find(p => !start.values[p] && entry(p).includes(digit))!;
  let before = note(start, single, digit);
  before = note(before, single, stale);
  before = engine.toggleBold(note(before, peer, digit), { indices: [peer], value: digit });
  const after = note(before, single, stale);
  const { game, cells } = engine.fillLoneNotes(after);
  assert.deepEqual(cells, [single]);
  assert.ok(!game.notes[peer].includes(digit));
  assert.ok(!game.bold[peer].includes(digit));
  const changed = game.values.flatMap((v, i) => v !== after.values[i] ? [i] : []);
  assert.deepEqual(changed, cells);
});

test('placing a number fills the peers it proves, and the fills prove no more in the same entry', () => {
  const generated = engine.fillNotes(start);
  const noted = { ...generated, noteOrigins: generated.noteOrigins.map(o => o && 'manual' as const) };
  const proved = (i: number) => engine.loneNoteCells(engine.enter(noted, { index: i, value: start.solution[i] })).filter(c => !engine.loneNoteCells(noted).includes(c));
  const target = empty.find(i => proved(i).length > 0)!;
  const placed = engine.enter(noted, { index: target, value: start.solution[target] });
  const { game, cells } = engine.fillLoneNotes(placed);
  assert.ok(proved(target).every(i => cells.includes(i)));
  assert.deepEqual(cells, engine.loneNoteCells(placed));
  for (const i of cells) assert.equal(game.values[i], start.solution[i]);
  assert.ok(engine.loneNoteCells(game).length > 0, 'the fills leave newly proven cells for the next entry');
});

test('a board with no lone notes and a finished board fill nothing', () => {
  assert.deepEqual(engine.fillLoneNotes(start), { game: start, cells: [] });
  const solved = { ...start, values: [...start.solution] };
  assert.deepEqual(engine.fillLoneNotes(solved), { game: solved, cells: [] });
});

const twin = (() => {
  const blank = engine.createGame({ id: 'twin', difficulty: 'easy', givens: Array(81).fill(0), solution: Array(81).fill(1) });
  const values = [...blank.values];
  for (let row = 3; row < 9; row++) values[row * 9] = values[row * 9 + 1] = row - 2;
  values[2] = 7;
  return engine.enter(engine.enter({ ...blank, values }, { index: 0, value: 9, pencil: true }), { index: 1, value: 9, pencil: true });
})();

test('one entry never fills the same digit into two peers', () => {
  const placed = engine.enter(twin, { index: 5, value: 8 });
  const { game, cells } = engine.fillLoneNotes(placed);
  assert.deepEqual(cells, [0]);
  assert.deepEqual(game.values.slice(0, 2), [9, 0]);
});

test('with Block incorrect answers on, a lone note that is not the answer stays a note', () => {
  const placed = engine.enter(twin, { index: 5, value: 8 });
  assert.deepEqual(engine.fillLoneNotes(placed, { blockIncorrectAnswers: true }), { game: placed, cells: [] });
});

test('a lone note the placed numbers rule out is not filled', () => {
  const wrong = note(start, single, stale);
  assert.deepEqual(engine.loneNoteCells(wrong), []);
  assert.deepEqual(engine.fillLoneNotes(wrong).cells, []);
});

test("a fill clears its own cell's exclusions and bold, and its digit from peer exclusions", () => {
  const digit = start.solution[single];
  const crossed = [1, 2, 3, 4, 5, 6, 7, 8, 9].find(d => d !== digit && d !== stale)!;
  const peer = peers(single).find(p => !start.values[p] && entry(p).includes(digit))!;
  let before = engine.enter(start, { index: peer, value: digit, exclude: true });
  before = engine.toggleBold(note(before, single, digit), { indices: [single], value: digit });
  before = engine.enter(note(before, single, stale), { index: single, value: crossed, exclude: true });
  const after = note(before, single, stale);
  const { game, cells } = engine.fillLoneNotes(after);
  assert.deepEqual(before.exclusions[single], [crossed]);
  assert.deepEqual(cells, [single]);
  assert.deepEqual(game.exclusions[single], []);
  assert.deepEqual(game.bold[single], []);
  assert.ok(!game.exclusions[peer].includes(digit));
});
