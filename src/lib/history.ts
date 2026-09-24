/** Bank puzzles a player has been served and completed, so Expert avoids repeats and completions can be shown later. */
export type PuzzleHistory = { seen: string[]; completed: string[] };
export const HISTORY_KEY = 'sudoku.puzzle-history.v1';
export const EMPTY_HISTORY: PuzzleHistory = { seen: [], completed: [] };

const isKeyList = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 10_000 && value.every(key => typeof key === 'string' && key.length <= 40);
export function readHistory(raw: string | null): PuzzleHistory {
  try {
    const parsed = JSON.parse(raw ?? 'null');
    if (parsed && isKeyList(parsed.seen) && isKeyList(parsed.completed)) return { seen: parsed.seen, completed: parsed.completed };
  } catch { /* History is optional; invalid data starts fresh. */ }
  return EMPTY_HISTORY;
}
/** Adds a served puzzle. `newCycle` means every current bank puzzle was already seen, so the list restarts with this one (dropping keys from older banks). */
export function recordSeen(history: PuzzleHistory, { source, newCycle }: { source: string; newCycle: boolean }): PuzzleHistory {
  if (newCycle) return { ...history, seen: [source] };
  return history.seen.includes(source) ? history : { ...history, seen: [...history.seen, source] };
}
export function recordCompleted(history: PuzzleHistory, source: string): PuzzleHistory {
  return history.completed.includes(source) ? history : { ...history, completed: [...history.completed, source] };
}
