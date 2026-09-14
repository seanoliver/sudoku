import { conflicts, peers, type Puzzle } from './sudoku.ts';
type Snapshot = { values: number[]; notes: number[][] };
export type GameState = Puzzle & Snapshot & { version: 1; history: Snapshot[] };
export const SAVE_KEY = 'sudoku.game.v1';
export function createGame(puzzle: Puzzle): GameState {
  return { ...puzzle, version: 1, values: [...puzzle.givens], notes: Array.from({ length: 81 }, () => []), history: [] };
}
export function enter(game: GameState, { index, value, pencil = false }: { index: number; value: number; pencil?: boolean }): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= 81 || !Number.isInteger(value) || value < 0 || value > 9 || game.givens[index] || isComplete(game)) return game;
  if (pencil && game.values[index] && value !== 0) return game;
  if (!pencil && game.values[index] === value && !game.notes[index].length) return game;
  const values = [...game.values];
  const notes = game.notes.map(n => [...n]);
  if (pencil && value) {
    notes[index] = notes[index].includes(value) ? notes[index].filter(n => n !== value) : [...notes[index], value].sort();
  } else {
    values[index] = value; notes[index] = [];
    if (value) for (const peer of peers(index)) notes[peer] = notes[peer].filter(n => n !== value);
  }
  return { ...game, values, notes, history: [...game.history.slice(-199), { values: game.values, notes: game.notes }] };
}
export function undo(game: GameState): GameState {
  const previous = game.history.at(-1);
  return previous ? { ...game, ...previous, history: game.history.slice(0, -1) } : game;
}
export function isComplete(game: GameState): boolean {
  return game.values.length === 81 && game.values.every((n,i) => n === game.solution[i]);
}
function isBoard(value: unknown, min = 0): value is number[] {
  return Array.isArray(value) && value.length === 81 && value.every(n => Number.isInteger(n) && n >= min && n <= 9);
}
function isNotes(value: unknown): value is number[][] {
  return Array.isArray(value) && value.length === 81 && value.every(n => Array.isArray(n) && n.length <= 9 && new Set(n).size === n.length && n.every(v => Number.isInteger(v) && v >= 1 && v <= 9));
}
export function restore(raw: string): GameState | null {
  try {
    if (raw.length > 1_000_000) return null;
    const game = JSON.parse(raw) as GameState;
    if (!game || game.version !== 1 || typeof game.id !== 'string' || game.id.length > 100 || !['easy','medium','hard'].includes(game.difficulty)) return null;
    if (!isBoard(game.givens) || !isBoard(game.solution, 1) || conflicts(game.solution).size || !isBoard(game.values) || !isNotes(game.notes)) return null;
    const validSnapshot = (s: Snapshot) => s && isBoard(s.values) && isNotes(s.notes) && game.givens.every((n,i) => !n || s.values[i] === n) && s.values.every((n,i) => !n || s.notes[i].length === 0);
    if (!game.givens.every((n,i) => !n || n === game.solution[i]) || !validSnapshot(game)) return null;
    if (!Array.isArray(game.history) || game.history.length > 200 || !game.history.every(validSnapshot)) return null;
    return game;
  } catch { return null; }
}
