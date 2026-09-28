import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, levelStats, monthGrid, readSolves, recordSolve, streak, SOLVES_CAP, type Solve } from '../src/lib/solves.ts';

const givens = '5'.repeat(30) + '0'.repeat(51);
const solve = (id: string, over: Partial<Solve> = {}): Solve => ({ id, difficulty: 'easy', seconds: 300, day: '2026-09-27', givens, ...over });

test('solves read back only when every field is valid', () => {
  assert.deepEqual(readSolves(null), []);
  assert.deepEqual(readSolves('nope'), []);
  assert.deepEqual(readSolves(JSON.stringify({ solves: [solve('a')] })), [solve('a')]);
  for (const bad of [{ difficulty: 'impossible' }, { seconds: -1 }, { seconds: 'x' }, { day: '27/09/2026' }, { givens: '123' }, { id: '' }]) {
    assert.deepEqual(readSolves(JSON.stringify({ solves: [solve('a'), solve('b', bad as Partial<Solve>)] })), [solve('a')], JSON.stringify(bad));
  }
});

test('a solve is recorded once, newest first, and the list is capped', () => {
  assert.deepEqual(recordSolve([solve('a')], solve('b')).map(s => s.id), ['b', 'a']);
  assert.deepEqual(recordSolve([solve('a')], solve('a', { seconds: 9 })), [solve('a')]);
  const full = Array.from({ length: SOLVES_CAP }, (_, k) => solve(`s${k}`));
  const next = recordSolve(full, solve('new'));
  assert.equal(next.length, SOLVES_CAP);
  assert.equal(next[0].id, 'new');
  assert.equal(next.at(-1)?.id, `s${SOLVES_CAP - 2}`);
});

test('each level counts its solves and keeps its best time', () => {
  const stats = levelStats([solve('a', { seconds: 400 }), solve('b', { seconds: 250 }), solve('c', { difficulty: 'hard', seconds: 900 })]);
  assert.deepEqual(stats.easy, { count: 2, best: 250 });
  assert.deepEqual(stats.hard, { count: 1, best: 900 });
  assert.deepEqual(stats.expert, { count: 0, best: null });
});

test('the streak counts consecutive days back from today, or from yesterday when today has none yet', () => {
  const days = (...list: string[]) => list.map((day, k) => solve(`d${k}`, { day }));
  assert.equal(streak(days('2026-09-27', '2026-09-26', '2026-09-25'), '2026-09-27'), 3);
  assert.equal(streak(days('2026-09-26', '2026-09-25'), '2026-09-27'), 2);
  assert.equal(streak(days('2026-09-25'), '2026-09-27'), 0);
  assert.equal(streak(days('2026-09-27', '2026-09-27', '2026-09-25'), '2026-09-27'), 1);
  assert.equal(streak(days('2026-10-01', '2026-09-30'), '2026-10-01'), 2);
  assert.equal(streak([], '2026-09-27'), 0);
});

test('a month grid starts on its weekday and lists every day', () => {
  const september = monthGrid(2026, 8);
  assert.equal(september.lead, 2);
  assert.equal(september.days.length, 30);
  assert.equal(september.days[0], '2026-09-01');
  assert.equal(monthGrid(2028, 1).days.length, 29);
});

test('day keys use the local calendar date', () => {
  assert.equal(dayKey(new Date(2026, 8, 7, 23, 59)), '2026-09-07');
  assert.equal(dayKey(new Date(2026, 0, 1, 0, 0)), '2026-01-01');
});
