import { conflicts, peers, type Puzzle } from './sudoku.ts';
import { getPlayableCandidates } from './candidates.ts';
export type NoteOrigin = 'manual' | 'generated' | null;
const emptyNotes = (): number[][] => Array.from({ length: 81 }, () => []);
type Snapshot = { values: number[]; notes: number[][]; exclusions: number[][]; noteOrigins: NoteOrigin[] };
export type GameState = Puzzle & Snapshot & { version: 1; history: Snapshot[] };
export const SAVE_KEY = 'sudoku.game.v1';
export function createGame(puzzle: Puzzle): GameState {
  return { ...puzzle, version: 1, values: [...puzzle.givens], notes: emptyNotes(), exclusions: emptyNotes(), noteOrigins: Array(81).fill(null), history: [] };
}
function record(game: GameState, next: Snapshot): GameState {
  const { values, notes, exclusions, noteOrigins } = game;
  return { ...game, ...next, history: [...game.history.slice(-199), { values, notes, exclusions, noteOrigins }] };
}
export function fillNotes(game: GameState): GameState {
  if (isComplete(game)) return game;
  const candidates = getPlayableCandidates(game);
  const notes = game.notes.map((cell, i) => game.values[i] || game.noteOrigins[i] === 'manual' ? cell : [...candidates[i]]);
  if (notes.every((cell, i) => cell.length === game.notes[i].length && cell.every(n => game.notes[i].includes(n)))) return game;
  const noteOrigins = game.noteOrigins.map((origin, i) => !game.values[i] && origin !== 'manual' && notes[i].length ? 'generated' as const : origin);
  return record(game, { values: game.values, notes, exclusions: game.exclusions, noteOrigins });
}
export function enter(game: GameState, { index, value, pencil = false, exclude = false }: { index: number; value: number; pencil?: boolean; exclude?: boolean }): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= 81 || !Number.isInteger(value) || value < 0 || value > 9 || game.givens[index] || isComplete(game)) return game;
  if ((pencil || exclude) && game.values[index] && value !== 0) return game;
  if (!pencil && !exclude && game.values[index] === value && !game.notes[index].length && !game.exclusions[index].length) return game;
  const values = [...game.values];
  const notes = game.notes.map(n => [...n]);
  const exclusions = game.exclusions.map(n => [...n]);
  const noteOrigins = [...game.noteOrigins];
  if ((pencil || exclude) && value) {
    const target = exclude ? exclusions : notes;
    const opposite = exclude ? notes : exclusions;
    target[index] = target[index].includes(value) ? target[index].filter(n => n !== value) : [...target[index], value].sort();
    opposite[index] = opposite[index].filter(n => n !== value);
    noteOrigins[index] = 'manual';
  } else {
    noteOrigins[index] = value || game.values[index] ? null : 'manual';
    values[index] = value; notes[index] = []; exclusions[index] = [];
    if (value) for (const peer of peers(index)) notes[peer] = notes[peer].filter(n => n !== value);
  }
  return record(game, { values, notes, exclusions, noteOrigins });
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
    const migrateSnapshot = (input: unknown): Snapshot | null => {
      if (!input || typeof input !== 'object') return null;
      const s = input as Snapshot;
      if (!isBoard(s.values) || !isNotes(s.notes)) return null;
      const legacy = !Object.hasOwn(s, 'exclusions') && !Object.hasOwn(s, 'noteOrigins');
      const exclusions = legacy ? emptyNotes() : s.exclusions;
      const noteOrigins: NoteOrigin[] = legacy ? s.notes.map(n => n.length ? 'manual' : null) : s.noteOrigins;
      if (!isNotes(exclusions) || !Array.isArray(noteOrigins) || noteOrigins.length !== 81 || !noteOrigins.every(o => o === null || o === 'manual' || o === 'generated')) return null;
      if (!game.givens.every((n,i) => !n || s.values[i] === n)) return null;
      if (!s.values.every((n,i) => n ? s.notes[i].length === 0 && exclusions[i].length === 0 && noteOrigins[i] === null
        : (!s.notes[i].length || noteOrigins[i] !== null) && (!exclusions[i].length || noteOrigins[i] === 'manual') && !s.notes[i].some(d => exclusions[i].includes(d)))) return null;
      return { values: s.values, notes: s.notes, exclusions, noteOrigins };
    };
    const current = migrateSnapshot(game);
    if (!game.givens.every((n,i) => !n || n === game.solution[i]) || !current) return null;
    if (!Array.isArray(game.history) || game.history.length > 200) return null;
    const history = game.history.map(migrateSnapshot);
    if (history.some(s => s === null)) return null;
    return { ...game, ...current, history: history as Snapshot[] };
  } catch { return null; }
}
