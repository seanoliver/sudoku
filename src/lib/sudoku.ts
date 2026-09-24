export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type Puzzle = { id: string; difficulty: Difficulty; givens: number[]; solution: number[] };
const indexes = Array.from({ length: 81 }, (_, i) => i);
const row = (i: number) => Math.floor(i / 9);
const box = (i: number) => Math.floor(row(i) / 3) * 3 + Math.floor((i % 9) / 3);
const peerTable = indexes.map(i => indexes.filter(j => j !== i && (row(i) === row(j) || i % 9 === j % 9 || box(i) === box(j))));
export function peers(index: number): number[] { return peerTable[index] ?? []; }
export type Unit = { kind: 'row' | 'column' | 'box'; number: number; cells: number[] };
const unitsOf = (index: number): Unit[] => [
  { kind: 'row', number: row(index) + 1, cells: indexes.filter(i => row(i) === row(index)) },
  { kind: 'column', number: index % 9 + 1, cells: indexes.filter(i => i % 9 === index % 9) },
  { kind: 'box', number: box(index) + 1, cells: indexes.filter(i => box(i) === box(index)) },
];
const isUnitComplete = (values: readonly number[], cells: number[]) => new Set(cells.map(i => values[i]).filter(Boolean)).size === 9;
/** Rows, columns and boxes containing `index` that `after` completes with 1–9 exactly once and `before` did not. */
export function completedUnits({ before, after, index }: { before: readonly number[]; after: readonly number[]; index: number }): Unit[] {
  if (!Number.isInteger(index) || index < 0 || index >= 81) return [];
  return unitsOf(index).filter(unit => isUnitComplete(after, unit.cells) && !isUnitComplete(before, unit.cells));
}
/** Screen-reader text such as "Row 5, column 5 and box 5 complete". */
export function celebrationLabel(units: readonly Unit[]): string {
  const names = units.map(({ kind, number }, i) => `${i ? kind : kind[0].toUpperCase() + kind.slice(1)} ${number}`);
  return `${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0] ?? ''} complete`;
}
export function getEntryDigits({ values, index }: { values: readonly number[]; index: number }): number[] {
  if (!Number.isInteger(index) || index < 0 || index >= 81) return [];
  const occupied = new Set(peers(index).map(peer => values[peer]));
  return [1,2,3,4,5,6,7,8,9].filter(digit => !occupied.has(digit));
}
/** Legal empty cells for a digit based on current entries, without solving the puzzle. */
export function possibleCells(values: number[], digit: number): Set<number> {
  if (!Number.isInteger(digit) || digit < 1 || digit > 9) return new Set();
  return new Set(indexes.filter(i => values[i] === 0 && !peers(i).some(j => values[j] === digit)));
}

export function conflicts(values: number[]): Set<number> {
  return new Set(indexes.filter(i => values[i] && peers(i).some(j => values[j] === values[i])));
}

/** MRV backtracking stops at two: callers only need zero, unique, or ambiguous. */
export function countSolutions(values: number[]): number {
  if (values.length !== 81 || values.some(n => !Number.isInteger(n) || n < 0 || n > 9) || conflicts(values).size) return 0;
  const board = [...values];
  let count = 0;
  function visit() {
    if (count >= 2) return;
    let chosen = -1;
    let candidates: number[] = [];
    for (const i of indexes) {
      if (board[i]) continue;
      const occupied = new Set(peers(i).map(j => board[j]));
      const options = [1,2,3,4,5,6,7,8,9].filter(n => !occupied.has(n));
      if (!options.length) return;
      if (chosen === -1 || options.length < candidates.length) { chosen = i; candidates = options; }
      if (options.length === 1) break;
    }
    if (chosen === -1) { count++; return; }
    for (const n of candidates) { board[chosen] = n; visit(); if (count >= 2) break; }
    board[chosen] = 0;
  }
  visit();
  return count;
}

// Raw clue targets. generatePuzzle('expert') only yields a minimal puzzle; real Expert puzzles come from createPuzzle in difficulty.ts.
export const CLUE_TARGETS: Record<Difficulty, number> = { easy: 42, medium: 34, hard: 28, expert: 0 };
export function generatePuzzle(difficulty: Difficulty, seed = Math.floor(Math.random() * 0xffffffff)): Puzzle {
  return buildPuzzle({ difficulty, seed, clueTarget: CLUE_TARGETS[difficulty] });
}
/** Removes clues in seeded random order while the solution stays unique, stopping at `clueTarget` (0 removes every removable clue). */
export function buildPuzzle({ difficulty, seed, clueTarget }: { difficulty: Difficulty; seed: number; clueTarget: number }): Puzzle {
  let state = seed >>> 0;
  function random() {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  function shuffle<T>(input: T[]): T[] {
    const result = [...input];
    for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
    return result;
  }
  const groups = () => shuffle([0,1,2]).flatMap(b => shuffle([0,1,2]).map(i => b * 3 + i));
  const rows = groups(), cols = groups(), digits = shuffle([1,2,3,4,5,6,7,8,9]);
  const solution = rows.flatMap(r => cols.map(c => digits[(r * 3 + Math.floor(r / 3) + c) % 9]));
  const givens = [...solution];
  const target = clueTarget;
  let remaining = 81;
  for (const i of shuffle(indexes)) {
    if (remaining <= target) break;
    const saved = givens[i]; givens[i] = 0;
    if (countSolutions(givens) !== 1) givens[i] = saved;
    else remaining--;
  }
  return { id: `${seed}-${difficulty}`, difficulty, givens, solution };
}
