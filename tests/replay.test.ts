import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardsOf, diffBoards, readReplays, recordBoard, replayStats, serializeReplays, stepKinds, REPLAY_BYTES, REPLAY_GAMES, REPLAY_STEPS, type Board, type Replays } from '../src/lib/replay.ts';

const empty = (): Board => ({ values: Array(81).fill(0), notes: Array.from({ length: 81 }, () => []), exclusions: Array.from({ length: 81 }, () => []) });
const withValues = (entries: Record<number, number>, base = empty()): Board => ({ ...base, values: base.values.map((v, i) => entries[i] ?? v) });
const givens = withValues({ 0: 5, 1: 3 });

test('a step holds only the cells that changed', () => {
  const next = { ...withValues({ 2: 4 }, givens), notes: givens.notes.map((n, i) => i === 10 ? [1, 7] : n) };
  assert.deepEqual(diffBoards(givens, next), [[2, 4, 0, 0], [10, 0, (1 << 1) | (1 << 7), 0]]);
  assert.deepEqual(diffBoards(givens, givens), []);
});

test('recording rebuilds every board from the first one', () => {
  const b1 = withValues({ 2: 4 }, givens);
  const b2 = { ...b1, exclusions: b1.exclusions.map((n, i) => i === 3 ? [9] : n) };
  const b3 = withValues({ 2: 0 }, b2);
  let replays: Replays = [];
  for (const board of [givens, b1, b1, b2, b3]) replays = recordBoard(replays, 'g1', board);
  const [entry] = replays;
  assert.equal(entry.steps.length, 3);
  assert.deepEqual(boardsOf(entry), [givens, b1, b2, b3]);
});

test('starting over records from the new first board', () => {
  let replays = recordBoard(recordBoard([], 'g1', givens), 'g1', withValues({ 2: 4 }, givens));
  replays = recordBoard(replays, 'g1', givens, { restart: true });
  assert.equal(replays[0].steps.length, 0);
  assert.deepEqual(boardsOf(replays[0]), [givens]);
});

test('steps are numbers, notes, or fixes of a wrong number', () => {
  const solution = Array(81).fill(1).map((_, i) => i === 2 ? 4 : 1);
  const wrong = withValues({ 2: 7 }, givens);
  const right = withValues({ 2: 4 }, givens);
  const noted = { ...right, notes: right.notes.map((n, i) => i === 9 ? [2] : n) };
  let replays: Replays = [];
  for (const board of [givens, wrong, right, noted]) replays = recordBoard(replays, 'g1', board);
  assert.deepEqual(stepKinds(replays[0], solution), ['number', 'fix', 'note']);
  assert.deepEqual(replayStats(replays[0], solution), { numbers: 1, notes: 1, fixes: 1 });
});

test('only the most recent games are kept, and a long game stops growing', () => {
  let replays: Replays = [];
  for (let k = 0; k <= REPLAY_GAMES; k++) replays = recordBoard(replays, `g${k}`, givens);
  assert.equal(replays.length, REPLAY_GAMES);
  assert.equal(replays.some(r => r.id === 'g0'), false);
  replays = recordBoard(replays, 'g1', givens);
  assert.equal(replays.at(-1)?.id, 'g1', 'recording a game makes it the most recent');
  let long = recordBoard([], 'long', givens);
  for (let k = 0; k < REPLAY_STEPS + 5; k++) long = recordBoard(long, 'long', withValues({ 5: k % 2 ? 1 : 2 }, givens));
  assert.equal(long[0].steps.length, REPLAY_STEPS);
});

test('past the step limit, new changes fold into the last step so the replay still ends on the final board', () => {
  let long = recordBoard([], 'long', givens);
  for (let k = 0; k < REPLAY_STEPS; k++) long = recordBoard(long, 'long', withValues({ 5: k % 2 ? 1 : 2 }, givens));
  const final = withValues({ 5: 3, 6: 9 }, givens);
  long = recordBoard(long, 'long', final);
  assert.equal(long[0].steps.length, REPLAY_STEPS);
  assert.deepEqual(boardsOf(long[0]).at(-1), final);
});

test('recordings stay within a storage budget by dropping the oldest games', () => {
  const noisy = (k: number): Board => ({ ...givens, notes: givens.notes.map((_, i) => i % 2 === k % 2 ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : []) });
  let replays: Replays = [];
  for (let game = 0; game < REPLAY_GAMES; game++) for (let k = 0; k < 400; k++) replays = recordBoard(replays, `g${game}`, noisy(k));
  assert.ok(serializeReplays(replays).length <= REPLAY_BYTES, `${serializeReplays(replays).length} bytes`);
  assert.equal(replays.at(-1)?.id, `g${REPLAY_GAMES - 1}`);
  assert.ok(replays.length < REPLAY_GAMES);
});

test('stored recordings read back only when valid', () => {
  const replays = recordBoard(recordBoard([], 'g1', givens), 'g1', withValues({ 2: 4 }, givens));
  assert.deepEqual(readReplays(JSON.stringify({ games: replays })), replays);
  assert.deepEqual(readReplays(null), []);
  assert.deepEqual(readReplays('{"games":[{"id":"x","start":[[99,1,0,0]],"steps":[]}]}'), []);
  assert.deepEqual(readReplays('{"games":[{"id":"x","start":[],"steps":[[[0,10,0,0]]]}]}'), []);
});

test('erasing or undoing a correct number is not counted as a number, a note, or a fix', () => {
  const solution = Array(81).fill(1).map((_, i) => i === 2 ? 4 : 1);
  const right = withValues({ 2: 4 }, givens);
  let replays: Replays = [];
  for (const board of [givens, right, givens, right]) replays = recordBoard(replays, 'g1', board);
  assert.deepEqual(stepKinds(replays[0], solution), ['number', 'other', 'number']);
  assert.deepEqual(replayStats(replays[0], solution), { numbers: 2, notes: 0, fixes: 0 });
});
