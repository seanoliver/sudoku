import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readHistory, recordSeen, recordCompleted, EMPTY_HISTORY } from '../src/lib/history.ts';
import { createPuzzle, expertCycleComplete, expertKey, isExpert } from '../src/lib/difficulty.ts';
import { EXPERT_BANK } from '../src/lib/expert-bank.ts';
import { createGame, restartGame, restore } from '../src/lib/game.ts';

test('history reads defensively and records seen and completed puzzles once', () => {
  for (const raw of [null, '', '{', '42', '{"seen":"x"}', '{"seen":[1],"completed":[]}']) assert.deepEqual(readHistory(raw), EMPTY_HISTORY);
  let history = recordSeen(EMPTY_HISTORY, { source: 'a', newCycle: false });
  history = recordSeen(history, { source: 'b', newCycle: false });
  history = recordSeen(history, { source: 'a', newCycle: false });
  assert.deepEqual(history.seen, ['a', 'b']);
  history = recordCompleted(recordCompleted(history, 'a'), 'a');
  assert.deepEqual(history.completed, ['a']);
  assert.deepEqual(readHistory(JSON.stringify(history)), history);
});

test('a new cycle restarts the seen list and drops keys from older banks', () => {
  const history = recordSeen({ seen: ['old-bank-key', 'a', 'b'], completed: ['a'] }, { source: 'c', newCycle: true });
  assert.deepEqual(history, { seen: ['c'], completed: ['a'] });
});

test('playing past the bank never repeats within a cycle and then starts over', () => {
  const size = EXPERT_BANK.length;
  let history = { seen: ['old-bank-key'], completed: [] as string[] };
  const served: string[] = [];
  for (let request = 1; request <= size * 2 + 5; request++) {
    const newCycle = expertCycleComplete(history.seen);
    const { source } = createPuzzle('expert', request * 7919, { avoid: history.seen });
    served.push(source!);
    history = recordSeen(history, { source: source!, newCycle });
  }
  assert.equal(new Set(served.slice(0, size)).size, size);
  assert.equal(new Set(served.slice(size, size * 2)).size, size);
  assert.equal(history.seen.length, 5);
});

test('expert puzzles avoid seen bank entries until all have been seen', () => {
  const keys = EXPERT_BANK.map(expertKey);
  assert.equal(new Set(keys).size, keys.length);
  const avoid = keys.slice(0, keys.length - 1);
  for (let seed = 1; seed <= 5; seed++) assert.equal(createPuzzle('expert', seed, { avoid }).source, keys[keys.length - 1]);
  assert.ok(keys.includes(createPuzzle('expert', 3, { avoid: keys }).source!));
  assert.equal(createPuzzle('easy', 3, { avoid: keys }).source, undefined);
});

test('a puzzle source survives saving, restoring, and restarting', () => {
  const game = createGame(createPuzzle('expert', 7));
  assert.ok(game.source);
  assert.equal(restore(JSON.stringify(game))?.source, game.source);
  assert.equal(restartGame(game).source, game.source);
  assert.equal(restore(JSON.stringify({ ...game, source: 42 }))?.source, undefined);
});
