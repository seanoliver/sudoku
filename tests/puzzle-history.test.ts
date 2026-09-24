import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readHistory, recordSeen, recordCompleted, EMPTY_HISTORY } from '../src/lib/history.ts';
import { createPuzzle, expertKey } from '../src/lib/difficulty.ts';
import { EXPERT_BANK } from '../src/lib/expert-bank.ts';
import { createGame, restartGame, restore } from '../src/lib/game.ts';

test('history reads defensively and records seen and completed puzzles once', () => {
  for (const raw of [null, '', '{', '42', '{"seen":"x"}', '{"seen":[1],"completed":[]}']) assert.deepEqual(readHistory(raw), EMPTY_HISTORY);
  let history = recordSeen(EMPTY_HISTORY, { source: 'a', total: 3 });
  history = recordSeen(history, { source: 'b', total: 3 });
  history = recordSeen(history, { source: 'a', total: 3 });
  assert.deepEqual(history.seen, ['a', 'b']);
  history = recordCompleted(recordCompleted(history, 'a'), 'a');
  assert.deepEqual(history.completed, ['a']);
  assert.deepEqual(readHistory(JSON.stringify(history)), history);
});

test('seeing every puzzle starts a new cycle', () => {
  let history = recordSeen(recordSeen(EMPTY_HISTORY, { source: 'a', total: 2 }), { source: 'b', total: 2 });
  assert.deepEqual(history.seen, ['a', 'b']);
  history = recordSeen(history, { source: 'c', total: 2 });
  assert.deepEqual(history.seen, ['c']);
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
