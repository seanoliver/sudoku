import type { Difficulty } from './sudoku.ts';

/** `fresh` is false for a game already in progress when tracking began, so it can never be clean. */
export type Evidence = { fresh: boolean; assisted: boolean; fixed: boolean; blocked: boolean; restarted: boolean };
export type EvidenceLog = Record<string, Evidence>;
export const EVIDENCE_KEY = 'sudoku.evidence.v1';
export const EVIDENCE_GAMES = 30;
const FLAGS = ['fresh', 'assisted', 'fixed', 'blocked', 'restarted'] as const;

const isEvidence = (value: unknown): value is Evidence => !!value && FLAGS.every(flag => typeof (value as Evidence)[flag] === 'boolean');
export function readEvidence(raw: string | null): EvidenceLog {
  try {
    const games = JSON.parse(raw ?? 'null')?.games;
    if (!games || typeof games !== 'object') return {};
    return Object.fromEntries(Object.entries(games).filter((entry): entry is [string, Evidence] => entry[0].length <= 60 && isEvidence(entry[1])).slice(-EVIDENCE_GAMES));
  } catch { return {}; }
}
export const serializeEvidence = (log: EvidenceLog) => JSON.stringify({ games: log });

export function noteEvidence(log: EvidenceLog, id: string, { fresh, ...raised }: Partial<Omit<Evidence, 'fresh'>> & { fresh: boolean }): EvidenceLog {
  const before = log[id] ?? { fresh, assisted: false, fixed: false, blocked: false, restarted: false };
  const next: Evidence = { ...before };
  for (const flag of ['assisted', 'fixed', 'blocked', 'restarted'] as const) if (raised[flag]) next[flag] = true;
  if (log[id] && FLAGS.every(flag => next[flag] === before[flag])) return log;
  return Object.fromEntries([...Object.entries(log).filter(([key]) => key !== id), [id, next] as const].slice(-EVIDENCE_GAMES));
}

export const isClean = (evidence: Evidence | undefined) =>
  Boolean(evidence?.fresh && !evidence.assisted && !evidence.fixed && !evidence.blocked && !evidence.restarted);

export type Earned = { kind: 'streak'; days: number } | { kind: 'first'; level: Difficulty } | { kind: 'clean' };
export type Accomplishments = Record<string, { day: string; solveId: string }>;
export const ACCOMPLISHMENTS_KEY = 'sudoku.accomplishments.v1';
export const STREAK_MILESTONES = [7, 30, 100] as const;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const KEY = /^(streak-\d+|first-(easy|medium|hard|expert))$/;

export function readAccomplishments(raw: string | null): Accomplishments {
  try {
    const earned = JSON.parse(raw ?? 'null')?.earned;
    if (!earned || typeof earned !== 'object') return {};
    return Object.fromEntries(Object.entries(earned).filter(([key, value]) => KEY.test(key) && !!value
      && typeof (value as { day: unknown }).day === 'string' && DAY.test((value as { day: string }).day)
      && typeof (value as { solveId: unknown }).solveId === 'string') as [string, { day: string; solveId: string }][]);
  } catch { return {}; }
}
export const serializeAccomplishments = (earned: Accomplishments) => JSON.stringify({ earned });

/** `streak` includes this solve; null for a regular game. */
export function earnAtSolve(earned: Accomplishments, { solveId, day, level, streak, firstAtLevel, clean }: { solveId: string; day: string; level: Difficulty; streak: number | null; firstAtLevel: boolean; clean: boolean }): { earned: Accomplishments; shown: Earned | null } {
  const next = { ...earned };
  const milestone = streak === null ? undefined : STREAK_MILESTONES.filter(days => streak >= days && !earned[`streak-${days}`]).at(-1);
  if (milestone) next[`streak-${milestone}`] = { day, solveId };
  const first = firstAtLevel && !earned[`first-${level}`];
  if (first) next[`first-${level}`] = { day, solveId };
  return { earned: next, shown: milestone ? { kind: 'streak', days: milestone } : first ? { kind: 'first', level } : clean ? { kind: 'clean' } : null };
}

export function earnedBy(earned: Accomplishments, { solveId, clean }: { solveId: string; clean: boolean }): Earned | null {
  const mine = Object.entries(earned).filter(([, value]) => value.solveId === solveId).map(([key]) => key);
  const days = mine.flatMap(key => /^streak-(\d+)$/.exec(key)?.[1] ?? []).map(Number);
  if (days.length) return { kind: 'streak', days: Math.max(...days) };
  const first = mine.find(key => key.startsWith('first-'));
  if (first) return { kind: 'first', level: first.slice('first-'.length) as Difficulty };
  return clean ? { kind: 'clean' } : null;
}

/** Finished-game ids and the Expert bank count predate History, so a first solve checks all three. */
export function isFirstAtLevel({ level, solveId, historyLevels, solvedIds, expertCompleted }: { level: Difficulty; solveId: string; historyLevels: readonly Difficulty[]; solvedIds: readonly string[]; expertCompleted: number }): boolean {
  if (historyLevels.includes(level)) return false;
  if (solvedIds.some(id => id !== solveId && id.endsWith(`-${level}`))) return false;
  return level !== 'expert' || expertCompleted === 0;
}
