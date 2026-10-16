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
  const { game, cells } = engine.fillLoneNotes(twoNotes, removed);
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
  assert.deepEqual(engine.fillLoneNotes(start, next), { game: next, cells: [] });
});

test('exclusions are not evidence', () => {
  const [keep, ...rest] = entry(open);
  let next = note(start, open, keep);
  for (const digit of rest) next = engine.enter(next, { index: open, value: digit, exclude: true });
  assert.deepEqual(engine.loneNoteCells(next), []);
  assert.deepEqual(engine.fillLoneNotes(start, next).cells, []);
});

test('a cell that was already proven before the action is left alone', () => {
  const proven = note(start, single, start.solution[single]);
  const unrelated = note(proven, open, entry(open)[0]);
  assert.deepEqual(engine.loneNoteCells(proven), [single]);
  assert.deepEqual(engine.fillLoneNotes(proven, unrelated).cells, []);
});

test('a fill clears its digit from peer notes, exclusions and bold, and fills only the cells the action proved', () => {
  const digit = start.solution[single];
  const peer = peers(single).find(p => !start.values[p] && entry(p).includes(digit))!;
  let before = note(start, single, digit);
  before = note(before, single, stale);
  before = engine.toggleBold(note(before, peer, digit), { indices: [peer], value: digit });
  const after = note(before, single, stale);
  const { game, cells } = engine.fillLoneNotes(before, after);
  assert.deepEqual(cells, [single]);
  assert.ok(!game.notes[peer].includes(digit));
  assert.ok(!game.bold[peer].includes(digit));
  const changed = game.values.flatMap((v, i) => v !== after.values[i] ? [i] : []);
  assert.deepEqual(changed, cells);
});

test('placing a number fills the peers it proves', () => {
  const noted = engine.fillNotes(start);
  const proved = (i: number) => engine.loneNoteCells(engine.enter(noted, { index: i, value: start.solution[i] })).filter(c => !engine.loneNoteCells(noted).includes(c));
  const target = empty.find(i => proved(i).length > 0)!;
  const placed = engine.enter(noted, { index: target, value: start.solution[target] });
  const { game, cells } = engine.fillLoneNotes(noted, placed);
  const fresh = proved(target);
  assert.ok(fresh.length > 0);
  assert.deepEqual(cells, fresh);
  for (const i of cells) assert.equal(game.values[i], start.solution[i]);
});

test('no change and a finished board fill nothing', () => {
  assert.deepEqual(engine.fillLoneNotes(start, start), { game: start, cells: [] });
  const solved = { ...start, values: [...start.solution] };
  assert.deepEqual(engine.fillLoneNotes(start, solved), { game: solved, cells: [] });
});
