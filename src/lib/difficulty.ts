import { buildPuzzle, CLUE_TARGETS, peers, type Difficulty, type Puzzle } from './sudoku.ts';
import { BOXES, COLUMNS, DIGITS, HOUSES, ROWS, type Candidates } from './deductions.ts';

/** Human solving techniques, easiest first. A puzzle is rated by the hardest one it needs. */
export const TECHNIQUES = ['naked-single', 'hidden-single', 'locked-candidates', 'pair', 'triple', 'x-wing', 'beyond'] as const;
export type Technique = typeof TECHNIQUES[number];
export const DIFFICULTY_BANDS: Record<Difficulty, readonly Technique[]> = { easy: ['naked-single'], medium: ['hidden-single'], hard: ['locked-candidates', 'pair'] };
// Hard removes every removable clue; the others keep their clue targets.
const GRADED_CLUE_TARGETS: Record<Difficulty, number> = { ...CLUE_TARGETS, hard: 0 };
const MAX_ATTEMPTS = 60;

const boxOf = (i: number) => Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3);
function subsets<T>(items: readonly T[], size: number): T[][] {
  if (!size) return [[]];
  if (items.length < size) return [];
  const [first, ...rest] = items;
  return [...subsets(rest, size - 1).map(set => [first, ...set]), ...subsets(rest, size)];
}

/** Pointing (box to line) and claiming (line to box) with two or three cells. */
function lockedCandidates(candidates: Candidates): boolean {
  let changed = false;
  for (const box of BOXES) for (const digit of DIGITS) {
    const cells = box.filter(i => candidates[i].has(digit));
    if (cells.length < 2 || cells.length > 3) continue;
    const rows = new Set(cells.map(i => Math.floor(i / 9))), columns = new Set(cells.map(i => i % 9));
    const line = rows.size === 1 ? ROWS[[...rows][0]] : columns.size === 1 ? COLUMNS[[...columns][0]] : null;
    if (line) for (const i of line) if (!box.includes(i) && candidates[i].delete(digit)) changed = true;
  }
  for (const line of [...ROWS, ...COLUMNS]) for (const digit of DIGITS) {
    const cells = line.filter(i => candidates[i].has(digit));
    const boxes = new Set(cells.map(boxOf));
    if (cells.length < 2 || cells.length > 3 || boxes.size !== 1) continue;
    for (const i of BOXES[[...boxes][0]]) if (!line.includes(i) && candidates[i].delete(digit)) changed = true;
  }
  return changed;
}

/** Naked and hidden sets of the given size within any row, column or box. */
function sets(candidates: Candidates, size: number): boolean {
  let changed = false;
  for (const house of HOUSES) {
    for (const cells of subsets(house.filter(i => candidates[i].size >= 2 && candidates[i].size <= size), size)) {
      const digits = new Set(cells.flatMap(i => [...candidates[i]]));
      if (digits.size !== size) continue;
      for (const i of house) if (!cells.includes(i)) for (const digit of digits) if (candidates[i].delete(digit)) changed = true;
    }
    for (const digits of subsets(DIGITS, size)) {
      if (digits.some(digit => !house.some(i => candidates[i].has(digit)))) continue;
      const cells = [...new Set(digits.flatMap(digit => house.filter(i => candidates[i].has(digit))))];
      if (cells.length !== size) continue;
      for (const i of cells) for (const digit of [...candidates[i]]) if (!digits.includes(digit) && candidates[i].delete(digit)) changed = true;
    }
  }
  return changed;
}

function xWing(candidates: Candidates): boolean {
  let changed = false;
  for (const [base, cover] of [[ROWS, COLUMNS], [COLUMNS, ROWS]] as const) for (const digit of DIGITS) {
    const positions = base.map(line => line.flatMap((i, k) => candidates[i].has(digit) ? [k] : []));
    for (let a = 0; a < 9; a++) for (let b = a + 1; b < 9; b++) {
      const [pa, pb] = [positions[a], positions[b]];
      if (pa.length !== 2 || pb.length !== 2 || pa[0] !== pb[0] || pa[1] !== pb[1]) continue;
      for (const k of pa) for (const i of cover[k]) if (!base[a].includes(i) && !base[b].includes(i) && candidates[i].delete(digit)) changed = true;
    }
  }
  return changed;
}

/** Solves with the easiest technique first, returning the hardest one used ('beyond' if these techniques cannot finish) and the board reached. */
export function solveWithTechniques(givens: readonly number[]): { technique: Technique; values: number[] } {
  const values = [...givens];
  const candidates: Candidates = values.map((value, i) => new Set(value ? [] : DIGITS.filter(digit => !peers(i).some(peer => values[peer] === digit))));
  const place = (index: number, digit: number) => { values[index] = digit; candidates[index].clear(); for (const peer of peers(index)) candidates[peer].delete(digit); };
  let hardest = 0;
  const steps: [number, () => boolean][] = [
    [1, () => { for (const house of HOUSES) for (const digit of DIGITS) { const cells = house.filter(i => candidates[i].has(digit)); if (cells.length === 1) { place(cells[0], digit); return true; } } return false; }],
    [2, () => lockedCandidates(candidates)],
    [3, () => sets(candidates, 2)],
    [4, () => sets(candidates, 3)],
    [5, () => xWing(candidates)],
  ];
  for (;;) {
    const naked = candidates.findIndex(cell => cell.size === 1);
    if (naked >= 0) { place(naked, [...candidates[naked]][0]); continue; }
    const step = steps.find(([, apply]) => apply());
    if (!step) break;
    hardest = Math.max(hardest, step[0]);
  }
  return { technique: values.every(Boolean) ? TECHNIQUES[hardest] : 'beyond', values };
}
/** The hardest technique a person needs to solve the puzzle. */
export function ratePuzzle(givens: readonly number[]): Technique {
  return solveWithTechniques(givens).technique;
}

/** A uniquely solvable puzzle whose rating falls in the difficulty's band, drawing seeded candidates until one fits. */
export function createPuzzle(difficulty: Difficulty, seed = Math.floor(Math.random() * 0xffffffff)): Puzzle {
  const band = DIFFICULTY_BANDS[difficulty];
  const ceiling = TECHNIQUES.indexOf(band[band.length - 1]);
  let first: Puzzle | null = null;
  let fallback: { puzzle: Puzzle; rank: number } | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const puzzle = buildPuzzle({ difficulty, seed: (seed + Math.imul(attempt, 0x9e3779b9)) >>> 0, clueTarget: GRADED_CLUE_TARGETS[difficulty] });
    first ??= puzzle;
    const rating = ratePuzzle(puzzle.givens);
    if (band.includes(rating)) return { ...puzzle, id: `${seed}-${difficulty}` };
    // Otherwise keep the hardest puzzle that does not exceed the band.
    const rank = TECHNIQUES.indexOf(rating);
    if (rank <= ceiling && (!fallback || rank > fallback.rank)) fallback = { puzzle, rank };
  }
  return { ...(fallback?.puzzle ?? first!), id: `${seed}-${difficulty}` };
}
