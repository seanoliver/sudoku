import { test } from 'node:test';
import assert from 'node:assert/strict';
import { earnAtSolve, earnedBy, EVIDENCE_GAMES, isClean, isFirstAtLevel, noteEvidence, readAccomplishments, readEvidence, serializeAccomplishments, serializeEvidence } from '../src/lib/accomplishments.ts';

const at = { solveId: 'g', day: '2026-10-13', level: 'easy' as const };

test('evidence starts fresh only for an unplayed game, and flags only go up', () => {
  let log = noteEvidence({}, 'g', { fresh: true });
  assert.deepEqual(log.g, { fresh: true, assisted: false, fixed: false, blocked: false, restarted: false });
  log = noteEvidence(log, 'g', { fresh: false, assisted: true });
  assert.equal(log.g.fresh, true, 'a known game keeps its first freshness');
  assert.equal(log.g.assisted, true);
  log = noteEvidence(log, 'g', { fresh: true, assisted: false });
  assert.equal(log.g.assisted, true, 'nothing lowers a flag');
  assert.equal(noteEvidence(log, 'g', { fresh: true }), log, 'no change keeps the same log');
  assert.equal(noteEvidence({}, 'late', { fresh: false }).late.fresh, false);
});

test('evidence keeps the newest games and reads back only valid records', () => {
  let log = {};
  for (let k = 0; k < EVIDENCE_GAMES + 5; k++) log = noteEvidence(log, `g${k}`, { fresh: true });
  log = noteEvidence(log, 'g10', { fresh: true, fixed: true });
  const ids = Object.keys(log);
  assert.equal(ids.length, EVIDENCE_GAMES);
  assert.equal(ids.at(-1), 'g10', 'a changed game becomes the newest');
  assert.ok(!ids.includes('g0'));
  for (let k = 0; k < EVIDENCE_GAMES; k++) log = noteEvidence(noteEvidence(log, `n${k}`, { fresh: true }), 'g10', { fresh: true });
  assert.equal((log as Record<string, { fixed: boolean }>).g10?.fixed, true, 'a game still being played is never evicted');
  assert.deepEqual(readEvidence(serializeEvidence(log)), log);
  const many = Object.fromEntries(Array.from({ length: EVIDENCE_GAMES + 5 }, (_, k) => [`m${k}`, { fresh: true, assisted: false, fixed: false, blocked: false, restarted: false }]));
  assert.deepEqual(Object.keys(readEvidence(serializeEvidence(many))), Object.keys(many).slice(-EVIDENCE_GAMES));
  assert.deepEqual(readEvidence('nope'), {});
  assert.deepEqual(readEvidence(JSON.stringify({ games: { a: { fresh: 'yes' } } })), {});
});

test('a solve is clean only when fresh, unassisted, unfixed, unblocked, and never restarted', () => {
  const base = { fresh: true, assisted: false, fixed: false, blocked: false, restarted: false };
  assert.equal(isClean(base), true);
  assert.equal(isClean(undefined), false);
  for (const flag of ['assisted', 'fixed', 'blocked', 'restarted'] as const) assert.equal(isClean({ ...base, [flag]: true }), false, flag);
  assert.equal(isClean({ ...base, fresh: false }), false);
});

test('the card shows a streak milestone, then a first solve, then a clean solve', () => {
  const all = earnAtSolve({}, { ...at, streak: 7, firstAtLevel: true, clean: true });
  assert.deepEqual(all.shown, { kind: 'streak', days: 7 });
  assert.deepEqual(Object.keys(all.earned).sort(), ['first-easy', 'streak-7']);
  assert.deepEqual(earnAtSolve({}, { ...at, streak: 3, firstAtLevel: true, clean: true }).shown, { kind: 'first', level: 'easy' });
  assert.deepEqual(earnAtSolve({}, { ...at, streak: null, firstAtLevel: false, clean: true }).shown, { kind: 'clean' });
  assert.equal(earnAtSolve({}, { ...at, streak: null, firstAtLevel: false, clean: false }).shown, null);
});

test('milestones are earned once, and a long streak earns the highest one not yet held', () => {
  const held = { 'streak-7': { day: '2026-10-01', solveId: 'old' }, 'first-easy': { day: '2026-10-01', solveId: 'old' } };
  const again = earnAtSolve(held, { ...at, streak: 8, firstAtLevel: true, clean: false });
  assert.equal(again.shown, null);
  assert.deepEqual(again.earned, held);
  const long = earnAtSolve({}, { ...at, streak: 31, firstAtLevel: false, clean: false });
  assert.deepEqual(long.shown, { kind: 'streak', days: 30 });
  assert.deepEqual(Object.keys(long.earned).sort(), ['streak-30', 'streak-7']);
  assert.equal(earnAtSolve(long.earned, { ...at, streak: 32, firstAtLevel: false, clean: false }).shown, null);
});

test('a streak one day short of a milestone earns nothing', () => {
  const held = (...days: number[]) => Object.fromEntries(days.map(d => [`streak-${d}`, { day: '2026-10-01', solveId: 'old' }]));
  for (const [streak, earned] of [[6, held()], [29, held(7)], [99, held(7, 30)]] as const) {
    assert.equal(earnAtSolve(earned, { ...at, streak, firstAtLevel: false, clean: false }).shown, null, String(streak));
  }
});

test('what a solve earned reads back after reopening', () => {
  const { earned } = earnAtSolve({}, { ...at, streak: 30, firstAtLevel: true, clean: true });
  assert.deepEqual(earnedBy(earned, { solveId: 'g', clean: true }), { kind: 'streak', days: 30 });
  const first = earnAtSolve({}, { ...at, streak: null, firstAtLevel: true, clean: true }).earned;
  assert.deepEqual(earnedBy(first, { solveId: 'g', clean: true }), { kind: 'first', level: 'easy' });
  assert.deepEqual(earnedBy(first, { solveId: 'other', clean: true }), { kind: 'clean' });
  assert.equal(earnedBy(first, { solveId: 'other', clean: false }), null);
  assert.deepEqual(readAccomplishments(serializeAccomplishments(earned)), earned);
  assert.deepEqual(readAccomplishments(JSON.stringify({ earned: { 'first-impossible': { day: '2026-10-13', solveId: 'g' }, 'streak-7': { day: 'x', solveId: 'g' } } })), {});
});

test('a first solve needs no earlier solve at the level in History, the solved ids, or the Expert bank', () => {
  const none = { level: 'hard' as const, solveId: '9-hard', historyLevels: [], solvedIds: ['9-hard', '3-easy'], expertCompleted: 0 };
  assert.equal(isFirstAtLevel(none), true);
  assert.equal(isFirstAtLevel({ ...none, historyLevels: ['hard'] }), false);
  assert.equal(isFirstAtLevel({ ...none, solvedIds: ['1-hard'] }), false);
  assert.equal(isFirstAtLevel({ ...none, solvedIds: ['daily-2026-10-12-hard'] }), false);
  assert.equal(isFirstAtLevel({ ...none, level: 'expert', solveId: '9-expert', expertCompleted: 1 }), false);
});
