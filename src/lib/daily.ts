import { restore, type GameState } from './game.ts';
import { CLOCK_KEY } from './home.ts';
import { addDays, streak } from './solves.ts';
import type { Difficulty } from './sudoku.ts';

export type DailySolve = { day: string; level: Difficulty; seconds: number };
/** The daily level last chosen. Each level's game has its own key, so a move rewrites only that game. */
export const DAILY_KEY = 'sudoku.daily.v1';
export const dailyGameKey = (level: Difficulty) => `sudoku.daily-game.v1.${level}`;
export const DAILY_SOLVES_KEY = 'sudoku.daily-solves.v1';
const LEVELS: readonly Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const dailyId = (day: string, level: Difficulty) => `daily-${day}-${level}`;
export function dailyOf(id: string): { day: string; level: Difficulty } | null {
  const match = /^daily-(\d{4}-\d{2}-\d{2})-(\w+)$/.exec(id);
  return match && LEVELS.includes(match[2] as Difficulty) ? { day: match[1], level: match[2] as Difficulty } : null;
}
/** FNV-1a of `<day>:<level>`, so everyone at a level gets the same puzzle that day. */
export function dailySeed(day: string, level: Difficulty): number {
  const text = `${day}:${level}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  return hash >>> 0;
}
/** Each daily level keeps its own clock, so the regular game's clock is never reset by one. */
export const clockKey = (id: string) => { const daily = dailyOf(id); return daily ? `sudoku.daily-clock.v1.${daily.level}` : CLOCK_KEY; };

export function readDailyLevel(raw: string | null): Difficulty | null {
  try { const level = JSON.parse(raw ?? 'null')?.level; return LEVELS.includes(level) ? level : null; } catch { return null; }
}
export const serializeDailyLevel = (level: Difficulty) => JSON.stringify({ level });
/** A level's stored daily, only when it is that level's daily for `today`: on a new day the last one is dropped, so a missed daily disappears. */
export function readDailyGame(raw: string | null, { today, level }: { today: string; level: Difficulty }): GameState | null {
  const game = raw ? restore(raw) : null;
  return game?.id === dailyId(today, level) ? game : null;
}
/** A daily is stored until its day has passed, so one kept open past midnight never replaces the new day's. */
export const storesDaily = (game: GameState, today: string) => { const daily = dailyOf(game.id); return Boolean(daily && daily.day >= today); };
/** The level a first daily starts at: the game in progress, then the newest solve, then Easy. */
export const firstDailyLevel = ({ game, newest }: { game?: Difficulty; newest?: Difficulty }): Difficulty => game ?? newest ?? 'easy';

export function readDailySolves(raw: string | null): DailySolve[] {
  try {
    const solved = JSON.parse(raw ?? 'null')?.solved;
    return Array.isArray(solved) ? solved.filter(s => s && typeof s.day === 'string' && DAY.test(s.day) && LEVELS.includes(s.level) && Number.isFinite(s.seconds) && s.seconds >= 0).map(({ day, level, seconds }) => ({ day, level, seconds })) : [];
  } catch { return []; }
}
export const serializeDailySolves = (solved: readonly DailySolve[]) => JSON.stringify({ solved });
/** One record per day and level; solving any level counts for the day. */
export const recordDailySolve = (solved: readonly DailySolve[], solve: DailySolve): DailySolve[] =>
  solved.some(s => s.day === solve.day && s.level === solve.level) ? [...solved] : [...solved, solve];
export const dailyStreak = (solved: readonly DailySolve[], today: string) => streak(solved, today);
/** The seven days ending today. */
export const weekOf = (today: string) => Array.from({ length: 7 }, (_, k) => addDays(today, k - 6));
/** Time left until the next daily, in whole minutes rounded up, as "2h 21m", or "21m" in the last hour. */
export function untilNext(now: Date): string {
  const left = Math.ceil((new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()) / 60_000);
  const hours = Math.floor(left / 60), minutes = left % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}
