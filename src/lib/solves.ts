import type { Difficulty } from './sudoku.ts';

/** One finished puzzle, kept for History. `givens` is the starting board as 81 digits, 0 for open cells. */
export type Solve = { id: string; difficulty: Difficulty; seconds: number; day: string; givens: string };
export const SOLVES_KEY = 'sudoku.solves.v1';
export const SOLVES_CAP = 500;
const LEVELS: readonly Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

const isSolve = (value: unknown): value is Solve => {
  const s = value as Solve;
  return !!s && typeof s.id === 'string' && s.id.length > 0 && s.id.length <= 60
    && LEVELS.includes(s.difficulty)
    && Number.isFinite(s.seconds) && s.seconds >= 0
    && typeof s.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.day)
    && typeof s.givens === 'string' && /^\d{81}$/.test(s.givens);
};

/** Newest first. Invalid entries are dropped so one bad record never hides the rest. */
export function readSolves(raw: string | null): Solve[] {
  try {
    const solves = JSON.parse(raw ?? 'null')?.solves;
    return Array.isArray(solves) ? solves.filter(isSolve).slice(0, SOLVES_CAP).map(({ id, difficulty, seconds, day, givens }) => ({ id, difficulty, seconds, day, givens })) : [];
  } catch { return []; }
}
export const serializeSolves = (solves: readonly Solve[]) => JSON.stringify({ solves });

/** A game is recorded the first time it is solved; solving it again after a restart keeps the first record. */
export const recordSolve = (solves: readonly Solve[], solve: Solve): Solve[] =>
  solves.some(s => s.id === solve.id) ? [...solves] : [solve, ...solves].slice(0, SOLVES_CAP);

export type LevelStats = Record<Difficulty, { count: number; best: number | null }>;
export function levelStats(solves: readonly Solve[]): LevelStats {
  const stats = Object.fromEntries(LEVELS.map(level => [level, { count: 0, best: null as number | null }])) as LevelStats;
  for (const { difficulty, seconds } of solves) {
    const level = stats[difficulty];
    level.count++;
    level.best = level.best === null ? seconds : Math.min(level.best, seconds);
  }
  return stats;
}

const addDays = (day: string, days: number) => {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + days));
};
/** Days in a row with a solve, ending today, or ending yesterday while today has none yet. */
export function streak(solves: readonly Solve[], today: string): number {
  const days = new Set(solves.map(s => s.day));
  let day = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(day)) { count++; day = addDays(day, -1); }
  return count;
}

/** `lead` blank cells before the 1st (weeks start on Sunday), then every day of the month as a day key. */
export function monthGrid(year: number, month: number): { lead: number; days: string[] } {
  const count = new Date(year, month + 1, 0).getDate();
  return { lead: new Date(year, month, 1).getDay(), days: Array.from({ length: count }, (_, k) => dayKey(new Date(year, month, k + 1))) };
}

export const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
