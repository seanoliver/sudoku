/** The parts of a game a replay shows. */
export type Board = { values: number[]; notes: number[][]; exclusions: number[][] };
/** One cell's full state after a change: cell, value, and notes and exclusions as 9-bit masks (bit d for digit d). */
export type Change = [cell: number, value: number, notes: number, exclusions: number];
/** `start` is the first board recorded, as changes from an empty board; each step is the cells one action changed. */
export type Replay = { id: string; start: Change[]; steps: Change[][] };
/** Oldest first. */
export type Replays = Replay[];
/** `other` is a step that only removes correct numbers, such as an erase or an undo. */
export type StepKind = 'number' | 'note' | 'fix' | 'other';

export const REPLAYS_KEY = 'sudoku.replays.v1';
export const REPLAY_GAMES = 20;
export const REPLAY_STEPS = 2000;
/** Recordings share the device's storage with the game's save, so all of them together stay under this many bytes. */
export const REPLAY_BYTES = 1_000_000;
// An upper bound on stored size: the longest change is "[80,9,1022,1022]," (17 characters), each step adds "[]," and each game its id and keys.
const sizeOf = (replay: Replay) => 80 + replay.id.length + 17 * (replay.start.length + replay.steps.reduce((n, step) => n + step.length, 0)) + 3 * replay.steps.length;
/** Drops the oldest games until the rest fit the budget; the newest game always stays. */
function withinBudget(replays: Replays): Replays {
  let total = replays.reduce((n, replay) => n + sizeOf(replay), 0);
  let first = 0;
  while (total > REPLAY_BYTES && first < replays.length - 1) total -= sizeOf(replays[first++]);
  return first ? replays.slice(first) : replays;
}
/** Later changes to a cell replace earlier ones. */
const merge = (earlier: Change[], later: Change[]): Change[] => {
  const cells = new Map(earlier.map(change => [change[0], change] as const));
  for (const change of later) cells.set(change[0], change);
  return [...cells.values()].sort((a, b) => a[0] - b[0]);
};

const mask = (digits: readonly number[]) => digits.reduce((m, d) => m | (1 << d), 0);
const digitsOf = (m: number) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => m & (1 << d));
const emptyBoard = (): Board => ({ values: Array(81).fill(0), notes: Array.from({ length: 81 }, () => []), exclusions: Array.from({ length: 81 }, () => []) });
const cellState = (board: Board, i: number): Change => [i, board.values[i], mask(board.notes[i]), mask(board.exclusions[i])];

export function diffBoards(before: Board, after: Board): Change[] {
  const changes: Change[] = [];
  for (let i = 0; i < 81; i++) {
    const a = cellState(before, i), b = cellState(after, i);
    if (a[1] !== b[1] || a[2] !== b[2] || a[3] !== b[3]) changes.push(b);
  }
  return changes;
}

function apply(board: Board, changes: readonly Change[]): Board {
  const next: Board = { values: [...board.values], notes: [...board.notes], exclusions: [...board.exclusions] };
  for (const [i, value, notes, exclusions] of changes) { next.values[i] = value; next.notes[i] = digitsOf(notes); next.exclusions[i] = digitsOf(exclusions); }
  return next;
}

/** The first board, then the board after each step. */
export function boardsOf(replay: Replay): Board[] {
  const boards = [apply(emptyBoard(), replay.start)];
  for (const step of replay.steps) boards.push(apply(boards[boards.length - 1], step));
  return boards;
}
const lastBoard = (replay: Replay) => replay.steps.reduce(apply, apply(emptyBoard(), replay.start));

/**
 * Adds a board to a game's recording. The first board for a game, or one marked `restart`, starts a new recording.
 * A board with no changes adds no step; past the step limit, changes fold into the last step so the replay still ends on
 * the latest board. The game becomes the most recent either way.
 */
export function recordBoard(replays: Replays, id: string, board: Board, { restart = false }: { restart?: boolean } = {}): Replays {
  const existing = replays.find(r => r.id === id);
  const others = replays.filter(r => r.id !== id);
  if (!existing || restart) return withinBudget([...others, { id, start: diffBoards(emptyBoard(), board), steps: [] }].slice(-REPLAY_GAMES));
  const step = diffBoards(lastBoard(existing), board);
  if (!step.length) return replays.at(-1) === existing ? replays : [...others, existing];
  const steps = existing.steps.length < REPLAY_STEPS ? [...existing.steps, step] : [...existing.steps.slice(0, -1), merge(existing.steps.at(-1) ?? [], step)];
  return withinBudget([...others, { ...existing, steps }]);
}

/** A step that removes or replaces a wrong number is a fix; one that fills an empty cell is a number; one that changes no number is a note. */
export function stepKinds(replay: Replay, solution: readonly number[]): StepKind[] {
  const boards = boardsOf(replay);
  return replay.steps.map((step, k) => {
    const before = boards[k];
    const numbers = step.filter(([i, value]) => value !== before.values[i]);
    if (!numbers.length) return 'note';
    if (numbers.some(([i]) => before.values[i] && before.values[i] !== solution[i])) return 'fix';
    return numbers.some(([i, value]) => value && !before.values[i]) ? 'number' : 'other';
  });
}

export function replayStats(replay: Replay, solution: readonly number[]) {
  const kinds = stepKinds(replay, solution);
  return { numbers: kinds.filter(k => k === 'number').length, notes: kinds.filter(k => k === 'note').length, fixes: kinds.filter(k => k === 'fix').length };
}

const isChange = (c: unknown): c is Change => Array.isArray(c) && c.length === 4
  && Number.isInteger(c[0]) && c[0] >= 0 && c[0] < 81 && Number.isInteger(c[1]) && c[1] >= 0 && c[1] <= 9
  && Number.isInteger(c[2]) && c[2] >= 0 && c[2] < 1024 && Number.isInteger(c[3]) && c[3] >= 0 && c[3] < 1024;
const isReplay = (r: unknown): r is Replay => {
  const x = r as Replay;
  return !!x && typeof x.id === 'string' && x.id.length > 0 && x.id.length <= 60 && Array.isArray(x.start) && x.start.every(isChange)
    && Array.isArray(x.steps) && x.steps.length <= REPLAY_STEPS && x.steps.every(s => Array.isArray(s) && s.every(isChange));
};
export function readReplays(raw: string | null): Replays {
  try {
    const games = JSON.parse(raw ?? 'null')?.games;
    return Array.isArray(games) ? games.filter(isReplay).slice(-REPLAY_GAMES) : [];
  } catch { return []; }
}
export const serializeReplays = (replays: Replays) => JSON.stringify({ games: replays });
