import { conflicts, peers, type Puzzle } from './sudoku.ts';
import { getPlayableCandidates } from './candidates.ts';
export type NoteOrigin = 'manual' | 'generated' | null;
const emptyNotes = (): number[][] => Array.from({ length: 81 }, () => []);
/** A cell's color: 0 none, 1 gold, 2 blue. */
export type CellColor = 0 | 1 | 2;
type Snapshot = { values: number[]; notes: number[][]; exclusions: number[][]; noteOrigins: NoteOrigin[]; colors: CellColor[]; bold: number[][] };
export type GameState = Puzzle & Snapshot & { version: 1; history: Snapshot[]; redoHistory: Snapshot[] };
export const SAVE_KEY = 'sudoku.game.v1';
export function createGame(puzzle: Puzzle): GameState {
  return { ...puzzle, version: 1, values: [...puzzle.givens], notes: emptyNotes(), exclusions: emptyNotes(), noteOrigins: Array(81).fill(null), colors: Array(81).fill(0), bold: emptyNotes(), history: [], redoHistory: [] };
}
export type Rejection = { kind: 'constraint' | 'answer'; sources: number[]; unit: 'row' | 'column' | 'box' | null };
const unitOf = (index: number, sources: number[]): Rejection['unit'] => sources.some(s => Math.floor(s / 9) === Math.floor(index / 9)) ? 'row' : sources.some(s => s % 9 === index % 9) ? 'column' : 'box';
/** True when a peer already holds the digit, so filtered notes and exclusions refuse it. */
const heldByPeer = (game: GameState, index: number, value: number) => peers(index).some(peer => game.values[peer] === value);
/** Why an entry would be refused, or null. Notes, erasing and givens are never rejected; an exclusion only when it crosses out the answer. */
export function rejectEntry(game: GameState, { index, value, pencil = false, exclude = false, blockIncorrectAnswers = false, filterNumberKeys = false }: { index: number; value: number; pencil?: boolean; exclude?: boolean; blockIncorrectAnswers?: boolean; filterNumberKeys?: boolean }): Rejection | null {
  if (!Number.isInteger(index) || index < 0 || index >= 81 || game.givens[index] || pencil || !Number.isInteger(value) || value < 1 || value > 9) return null;
  if (exclude) return blockIncorrectAnswers && !game.values[index] && value === game.solution[index] && !game.exclusions[index].includes(value) ? { kind: 'answer', sources: [], unit: null } : null;
  if (filterNumberKeys) {
    const sources = peers(index).filter(peer => game.values[peer] === value);
    if (sources.length) return { kind: 'constraint', sources, unit: unitOf(index, sources) };
  }
  if (blockIncorrectAnswers && value !== game.solution[index]) return { kind: 'answer', sources: [], unit: null };
  return null;
}
export function restartGame({ id, difficulty, givens, solution, source }: GameState): GameState {
  return createGame({ id, difficulty, givens, solution, ...(source === undefined ? {} : { source }) });
}
function snapshot({ values, notes, exclusions, noteOrigins, colors, bold }: GameState): Snapshot {
  return { values, notes, exclusions, noteOrigins, colors, bold };
}
/** A note that goes away takes its bold with it, whichever change removed it. */
function record(game: GameState, next: Partial<Snapshot>): GameState {
  const notes = next.notes ?? game.notes, bold = next.bold ?? game.bold;
  const kept = bold.map((cell, i) => cell.every(d => notes[i].includes(d)) ? cell : cell.filter(d => notes[i].includes(d)));
  return { ...game, ...next, bold: kept, history: [...game.history.slice(-199), snapshot(game)], redoHistory: [] };
}
/**
 * Holding a number key: bolds `value` in every selected empty cell, adding the note where it is missing,
 * or makes it plain again when every selected cell already has it bold.
 */
export function toggleBold(game: GameState, { indices, value, filterNumberKeys = false }: { indices: readonly number[]; value: number; filterNumberKeys?: boolean }): GameState {
  if (!Number.isInteger(value) || value < 1 || value > 9 || isComplete(game)) return game;
  const cells = batchCells(game, indices).filter(index => game.notes[index].includes(value) || !(filterNumberKeys && heldByPeer(game, index, value)));
  if (!cells.length) return game;
  const bold = [...game.bold];
  if (cells.every(index => game.bold[index].includes(value))) {
    for (const index of cells) bold[index] = bold[index].filter(n => n !== value);
    return record(game, { bold });
  }
  const notes = [...game.notes], exclusions = [...game.exclusions], noteOrigins = [...game.noteOrigins];
  for (const index of cells) {
    if (!notes[index].includes(value)) { notes[index] = [...notes[index], value].sort(); exclusions[index] = exclusions[index].filter(n => n !== value); noteOrigins[index] = 'manual'; }
    bold[index] = bold[index].includes(value) ? bold[index] : [...bold[index], value].sort();
  }
  return record(game, { notes, exclusions, noteOrigins, bold });
}
export function fillNotes(game: GameState): GameState {
  if (isComplete(game)) return game;
  const candidates = getPlayableCandidates(game);
  const notes = game.notes.map((cell, i) => game.values[i] ? cell : [...candidates[i]]);
  const noteOrigins: NoteOrigin[] = notes.map((cell, i) => game.values[i] ? game.noteOrigins[i]
    : cell.length ? 'generated' : game.exclusions[i].length ? 'manual' : null);
  if (notes.every((cell, i) => cell.length === game.notes[i].length && cell.every(n => game.notes[i].includes(n))
    && noteOrigins[i] === game.noteOrigins[i])) return game;
  return record(game, { values: game.values, notes, exclusions: game.exclusions, noteOrigins });
}
/** Colors the non-given cells among `indices`, or clears them when they all already have `color`. Color 0 clears. */
export function paintCells(game: GameState, { indices, color }: { indices: readonly number[]; color: CellColor }): GameState {
  const cells = [...new Set(indices)].filter(index => Number.isInteger(index) && index >= 0 && index < 81 && !game.givens[index]);
  if (!cells.length || isComplete(game)) return game;
  const next = color && cells.every(index => game.colors[index] === color) ? 0 : color;
  if (cells.every(index => game.colors[index] === next)) return game;
  const colors = [...game.colors];
  for (const index of cells) colors[index] = next;
  return record(game, { colors });
}
export function clearColors(game: GameState): GameState {
  return game.colors.some(Boolean) && !isComplete(game) ? record(game, { colors: Array(81).fill(0) }) : game;
}
/** Empty, editable cells among a batch's indices. */
const batchCells = (game: GameState, indices: readonly number[]) => [...new Set(indices)].filter(index => Number.isInteger(index) && index >= 0 && index < 81 && !game.givens[index] && !game.values[index]);
/** True when every selected empty cell already has the mark, so a batch tap removes it. */
export function batchHasMark(game: GameState, { indices, value, marks }: { indices: readonly number[]; value: number; marks: 'notes' | 'exclusions' }): boolean {
  const cells = batchCells(game, indices);
  return cells.length > 0 && cells.every(index => game[marks][index].includes(value));
}
/** When every selected empty cell already has the mark, a batch removes it from all of them. */
function removeFromBatch(game: GameState, { indices, value, marks }: { indices: readonly number[]; value: number; marks: 'notes' | 'exclusions' }): GameState | null {
  if (!batchHasMark(game, { indices, value, marks })) return null;
  const cells = batchCells(game, indices);
  const notes = [...game.notes], exclusions = [...game.exclusions], noteOrigins = [...game.noteOrigins];
  const target = marks === 'notes' ? notes : exclusions;
  for (const index of cells) { target[index] = target[index].filter(n => n !== value); noteOrigins[index] = 'manual'; }
  return record(game, { values: game.values, notes, exclusions, noteOrigins });
}
export function toggleNotes(game: GameState, { indices, value, filterNumberKeys = false }: { indices: readonly number[]; value: number; filterNumberKeys?: boolean }): GameState {
  if (!Number.isInteger(value) || value < 1 || value > 9 || isComplete(game)) return game;
  const removed = removeFromBatch(game, { indices, value, marks: 'notes' });
  if (removed) return removed;
  const targets = [...new Set(indices)].filter(index => Number.isInteger(index) && index >= 0 && index < 81
    && !game.givens[index] && !game.values[index] && !(filterNumberKeys && heldByPeer(game, index, value))
    && (!game.notes[index].includes(value) || game.noteOrigins[index] !== 'manual'));
  if (!targets.length) return game;
  const notes = [...game.notes];
  const exclusions = [...game.exclusions];
  const noteOrigins = [...game.noteOrigins];
  for (const index of targets) {
    notes[index] = notes[index].includes(value) ? notes[index] : [...notes[index], value].sort();
    exclusions[index] = exclusions[index].filter(n => n !== value);
    noteOrigins[index] = 'manual';
  }
  return record(game, { values: game.values, notes, exclusions, noteOrigins });
}
/** Selected cells whose answer a batch would cross out. Empty when the batch removes the exclusion instead. */
export function incorrectExclusions(game: GameState, { indices, value }: { indices: readonly number[]; value: number }): number[] {
  if (batchHasMark(game, { indices, value, marks: 'exclusions' })) return [];
  return batchCells(game, indices).filter(index => game.solution[index] === value && !game.exclusions[index].includes(value));
}
export function toggleExclusions(game: GameState, { indices, value, filterNumberKeys = false, blockIncorrectAnswers = false }: { indices: readonly number[]; value: number; filterNumberKeys?: boolean; blockIncorrectAnswers?: boolean }): GameState {
  if (!Number.isInteger(value) || value < 1 || value > 9 || isComplete(game)) return game;
  const removed = removeFromBatch(game, { indices, value, marks: 'exclusions' });
  if (removed) return removed;
  if (blockIncorrectAnswers && incorrectExclusions(game, { indices, value }).length) return game;
  const targets = [...new Set(indices)].filter(index => Number.isInteger(index) && index >= 0 && index < 81
    && !game.givens[index] && !game.values[index] && !(filterNumberKeys && heldByPeer(game, index, value)) && !game.exclusions[index].includes(value));
  if (!targets.length) return game;
  const notes = [...game.notes];
  const exclusions = [...game.exclusions];
  const noteOrigins = [...game.noteOrigins];
  for (const index of targets) {
    notes[index] = notes[index].filter(n => n !== value);
    exclusions[index] = [...exclusions[index], value].sort();
    noteOrigins[index] = 'manual';
  }
  return record(game, { values: game.values, notes, exclusions, noteOrigins });
}
/** Records several (cell, digit) exclusions as one undo step, skipping filled cells and ones already excluded. */
export function excludeCandidates(game: GameState, { eliminations }: { eliminations: readonly { cell: number; digit: number }[] }): GameState {
  const targets = eliminations.filter(({ cell, digit }) => Number.isInteger(cell) && cell >= 0 && cell < 81 && Number.isInteger(digit) && digit >= 1 && digit <= 9 && !game.givens[cell] && !game.values[cell] && !game.exclusions[cell].includes(digit));
  if (!targets.length || isComplete(game)) return game;
  const notes = [...game.notes], exclusions = [...game.exclusions], noteOrigins = [...game.noteOrigins];
  for (const { cell, digit } of targets) {
    notes[cell] = notes[cell].filter(n => n !== digit);
    exclusions[cell] = [...new Set([...exclusions[cell], digit])].sort();
    noteOrigins[cell] = 'manual';
  }
  return record(game, { values: game.values, notes, exclusions, noteOrigins });
}
export function enter(game: GameState, { index, value, pencil = false, exclude = false, blockIncorrectAnswers = false, filterNumberKeys = false }: { index: number; value: number; pencil?: boolean; exclude?: boolean; blockIncorrectAnswers?: boolean; filterNumberKeys?: boolean }): GameState {
  if (!Number.isInteger(index) || index < 0 || index >= 81 || !Number.isInteger(value) || value < 0 || value > 9 || game.givens[index] || isComplete(game)) return game;
  if (rejectEntry(game, { index, value, pencil, exclude, blockIncorrectAnswers, filterNumberKeys })) return game;
  if ((pencil || exclude) && game.values[index] && value !== 0) return game;
  if ((pencil || exclude) && value && filterNumberKeys && !(exclude ? game.exclusions : game.notes)[index].includes(value) && heldByPeer(game, index, value)) return game;
  if ((value === 0 || (!pencil && !exclude)) && game.values[index] === value && !game.notes[index].length && !game.exclusions[index].length) return game;
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
    if (value) for (const peer of peers(index)) { notes[peer] = notes[peer].filter(n => n !== value); exclusions[peer] = exclusions[peer].filter(n => n !== value); }
  }
  return record(game, { values, notes, exclusions, noteOrigins });
}
export function undo(game: GameState): GameState {
  const previous = game.history.at(-1);
  return previous ? { ...game, ...previous, history: game.history.slice(0, -1), redoHistory: [...game.redoHistory, snapshot(game)] } : game;
}
export function redo(game: GameState): GameState {
  const next = game.redoHistory.at(-1);
  return next ? { ...game, ...next, history: [...game.history, snapshot(game)], redoHistory: game.redoHistory.slice(0, -1) } : game;
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
    if (!game || game.version !== 1 || typeof game.id !== 'string' || game.id.length > 100 || !['easy','medium','hard','expert'].includes(game.difficulty)) return null;
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
        : (!s.notes[i].length || noteOrigins[i] !== null) && (!exclusions[i].length || noteOrigins[i] !== null) && !s.notes[i].some(d => exclusions[i].includes(d)))) return null;
      const colors = Object.hasOwn(s, 'colors') ? s.colors : Array(81).fill(0);
      if (!Array.isArray(colors) || colors.length !== 81 || !colors.every((c, i) => c === 0 || (!game.givens[i] && (c === 1 || c === 2)))) return null;
      const bold = Object.hasOwn(s, 'bold') ? s.bold : emptyNotes();
      if (!isNotes(bold) || !bold.every((cell, i) => cell.every(d => s.notes[i].includes(d)))) return null;
      return { values: s.values, notes: s.notes, exclusions, noteOrigins, colors, bold };
    };
    const current = migrateSnapshot(game);
    if (!game.givens.every((n,i) => !n || n === game.solution[i]) || !current) return null;
    if (!Array.isArray(game.history) || game.history.length > 200) return null;
    const savedRedo = Object.hasOwn(game, 'redoHistory') ? game.redoHistory : [];
    if (!Array.isArray(savedRedo) || game.history.length + savedRedo.length > 200) return null;
    const history = game.history.map(migrateSnapshot);
    const redoHistory = savedRedo.map(migrateSnapshot);
    if (history.some(s => s === null) || redoHistory.some(s => s === null)) return null;
    const { source, ...rest } = game;
    return { ...rest, ...(typeof source === 'string' && source.length <= 40 ? { source } : {}), ...current, history: history as Snapshot[], redoHistory: redoHistory as Snapshot[] };
  } catch { return null; }
}
