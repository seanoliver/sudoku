import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clockKey, dailyId, dailyOf, dailySeed, dailyStreak, firstDailyLevel, dailyGameKey, readDailyGame, readDailyLevel, readDailySolves, recordDailySolve, serializeDailyLevel, serializeDailySolves, storesDaily, untilNext, weekOf, type DailySolve } from '../src/lib/daily.ts';
import { createPuzzle } from '../src/lib/difficulty.ts';
import { createGame } from '../src/lib/game.ts';
import { CLOCK_KEY } from '../src/lib/home.ts';

const today = '2026-10-12';
const daily = (day: string, level: 'easy' | 'medium' = 'easy') => createGame({ ...createPuzzle(level, dailySeed(day, level)), id: dailyId(day, level) });

test('a daily is the same puzzle for everyone at a level on a day, and differs by level and day', () => {
  assert.equal(dailySeed(today, 'easy'), dailySeed(today, 'easy'));
  assert.notEqual(dailySeed(today, 'easy'), dailySeed(today, 'medium'));
  assert.notEqual(dailySeed(today, 'easy'), dailySeed('2026-10-13', 'easy'));
  assert.deepEqual(createPuzzle('medium', dailySeed(today, 'medium')).givens, createPuzzle('medium', dailySeed(today, 'medium')).givens);
  assert.deepEqual(createPuzzle('expert', dailySeed(today, 'expert'), { avoid: [] }).givens, createPuzzle('expert', dailySeed(today, 'expert'), { avoid: [] }).givens);
});

test('a daily id names its day and level, and only dailies have one', () => {
  assert.equal(dailyId(today, 'hard'), 'daily-2026-10-12-hard');
  assert.deepEqual(dailyOf('daily-2026-10-12-hard'), { day: today, level: 'hard' });
  assert.equal(dailyOf('12345-hard'), null);
  assert.equal(dailyOf('daily-2026-10-12-impossible'), null);
});

test('each daily level keeps its own clock, apart from the regular game', () => {
  assert.equal(clockKey('12345-easy'), CLOCK_KEY);
  assert.equal(clockKey(dailyId(today, 'medium')), 'sudoku.daily-clock.v1.medium');
  assert.notEqual(clockKey(dailyId(today, 'easy')), clockKey(dailyId(today, 'medium')));
  assert.match(clockKey(dailyId(today, 'expert')), /^sudoku\.[\w.-]+$/);
});

test('a stored daily reads back only as that level’s daily for today', () => {
  const game = daily(today);
  assert.deepEqual(readDailyGame(JSON.stringify(game), { today, level: 'easy' }), game);
  assert.equal(readDailyGame(JSON.stringify(game), { today: '2026-10-13', level: 'easy' }), null);
  assert.equal(readDailyGame(JSON.stringify(game), { today, level: 'medium' }), null);
  assert.equal(readDailyGame(JSON.stringify(createGame(createPuzzle('easy', 3))), { today, level: 'easy' }), null);
  assert.equal(readDailyGame('nope', { today, level: 'easy' }), null);
  assert.equal(readDailyGame(null, { today, level: 'easy' }), null);
});

test('each level has its own key, and the level key holds only the chosen level', () => {
  assert.equal(dailyGameKey('hard'), 'sudoku.daily-game.v1.hard');
  assert.notEqual(dailyGameKey('easy'), dailyGameKey('medium'));
  assert.match(dailyGameKey('expert'), /^sudoku\.[\w.-]+$/);
  assert.equal(readDailyLevel(serializeDailyLevel('hard')), 'hard');
  assert.equal(readDailyLevel(JSON.stringify({ level: 'impossible' })), null);
  assert.equal(readDailyLevel('nope'), null);
});

test('a daily is stored until its day has passed', () => {
  assert.equal(storesDaily(daily(today), today), true);
  assert.equal(storesDaily(daily('2026-10-11'), today), false);
  assert.equal(storesDaily(createGame(createPuzzle('easy', 3)), today), false);
});

test('the first daily level follows the game in progress, then the newest solve, then Easy', () => {
  assert.equal(firstDailyLevel({ game: 'hard', newest: 'medium' }), 'hard');
  assert.equal(firstDailyLevel({ newest: 'medium' }), 'medium');
  assert.equal(firstDailyLevel({}), 'easy');
});

const solved = (...days: string[]): DailySolve[] => days.map(day => ({ day, level: 'easy', seconds: 60 }));
test('daily solves read back when valid, once per day and level', () => {
  assert.deepEqual(readDailySolves(serializeDailySolves(solved(today))), solved(today));
  assert.deepEqual(readDailySolves(JSON.stringify({ solved: [...solved(today), { day: 'x', level: 'easy', seconds: 1 }, { day: today, level: 'easy', seconds: -1 }] })), solved(today));
  assert.deepEqual(readDailySolves('nope'), []);
  assert.deepEqual(recordDailySolve(solved(today), { day: today, level: 'easy', seconds: 5 }), solved(today));
  assert.equal(recordDailySolve(solved(today), { day: today, level: 'hard', seconds: 5 }).length, 2);
});

test('the daily streak counts days in a row with any daily solved, through yesterday until today is solved', () => {
  assert.equal(dailyStreak(solved('2026-10-11', '2026-10-10', '2026-10-08'), today), 2);
  assert.equal(dailyStreak([...solved('2026-10-11', '2026-10-10'), { day: today, level: 'hard', seconds: 1 }, { day: today, level: 'easy', seconds: 1 }], today), 3);
  assert.equal(dailyStreak(solved('2026-10-10'), today), 0);
});

test('the week is the seven days ending today, across a month', () => {
  assert.deepEqual(weekOf('2026-10-02'), ['2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
});

test('the countdown runs to local midnight', () => {
  assert.equal(untilNext(new Date(2026, 9, 12, 21, 39, 30)), '2h 21m');
  assert.equal(untilNext(new Date(2026, 9, 12, 21, 39)), '2h 21m');
  assert.equal(untilNext(new Date(2026, 9, 12, 23, 30)), '30m');
});
