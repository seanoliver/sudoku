import { buildPuzzle, CLUE_TARGETS, peers, type Difficulty, type Puzzle } from './sudoku.ts';
import { EXPERT_BANK } from './expert-bank.ts';
import { BOXES, COLUMNS, DIGITS, HOUSES, ROWS, type Candidates } from './deductions.ts';

/** Human solving techniques, easiest first. A puzzle is rated by the hardest one it needs. */
export const TECHNIQUES = ['naked-single', 'hidden-single', 'locked-candidates', 'pair', 'triple', 'x-wing', 'quad', 'swordfish', 'xy-wing', 'coloring', 'beyond'] as const;
export type Technique = typeof TECHNIQUES[number];
/** Expert needs repeated advanced reasoning early, not one late trick: at least this many advanced steps, the first while this many cells or fewer are filled. */
export const EXPERT_RULE = { minAdvancedSteps: 3, maxFilledAtFirstAdvanced: 45 } as const;
export const DIFFICULTY_BANDS: Record<Difficulty, readonly Technique[]> = { easy: ['naked-single'], medium: ['hidden-single'], hard: ['locked-candidates', 'pair'], expert: ['triple', 'x-wing', 'quad', 'swordfish', 'xy-wing', 'coloring'] };
// Hard removes every removable clue; the others keep their clue targets.
const GRADED_CLUE_TARGETS: Record<Difficulty, number> = { ...CLUE_TARGETS, hard: 0 }; // expert never generates; it comes from EXPERT_BANK
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

function swordfish(candidates: Candidates): boolean {
  let changed = false;
  for (const [base, cover] of [[ROWS, COLUMNS], [COLUMNS, ROWS]] as const) for (const digit of DIGITS) {
    const positions = base.map(line => line.flatMap((i, k) => candidates[i].has(digit) ? [k] : []));
    const eligible = [...Array(9).keys()].filter(a => positions[a].length >= 2 && positions[a].length <= 3);
    for (const lines of subsets(eligible, 3)) {
      const union = new Set(lines.flatMap(a => positions[a]));
      if (union.size !== 3) continue;
      for (const k of union) for (const i of cover[k]) if (!lines.some(a => base[a].includes(i)) && candidates[i].delete(digit)) changed = true;
    }
  }
  return changed;
}
const sees = (a: number, b: number) => a !== b && (Math.floor(a / 9) === Math.floor(b / 9) || a % 9 === b % 9 || boxOf(a) === boxOf(b));
function xyWing(candidates: Candidates): boolean {
  const bivalue = [...Array(81).keys()].filter(i => candidates[i].size === 2);
  for (const pivot of bivalue) {
    const [a, b] = [...candidates[pivot]];
    const wings = bivalue.filter(i => sees(i, pivot));
    for (const x of wings) for (const y of wings) {
      if (x >= y) continue;
      const cx = candidates[x], cy = candidates[y];
      for (const [p, q] of [[a, b], [b, a]]) {
        if (!cx.has(p) || cx.has(q) || !cy.has(q) || cy.has(p)) continue;
        const c = [...cx].find(d => d !== p);
        if (c === undefined || !cy.has(c) || c === a || c === b) continue;
        let changed = false;
        for (let i = 0; i < 81; i++) if (i !== x && i !== y && i !== pivot && sees(i, x) && sees(i, y) && candidates[i].delete(c)) changed = true;
        if (changed) return true;
      }
    }
  }
  return false;
}
/** Single-digit coloring over conjugate pairs (houses with exactly two cells for the digit). */
// Exactly one cell of each conjugate pair holds the digit, so a sound board always 2-colors cleanly; the search can skip already-colored cells without checking for clashes.
function coloring(candidates: Candidates): boolean {
  for (const digit of DIGITS) {
    const links = new Map<number, number[]>();
    for (const house of HOUSES) { const cells = house.filter(i => candidates[i].has(digit)); if (cells.length === 2) { const [p, q] = cells; links.set(p, [...(links.get(p) ?? []), q]); links.set(q, [...(links.get(q) ?? []), p]); } }
    const color = new Map<number, number>();
    for (const start of links.keys()) {
      if (color.has(start)) continue;
      const component: number[] = []; const queue = [start]; color.set(start, 0);
      while (queue.length) { const cell = queue.shift()!; component.push(cell); for (const next of links.get(cell) ?? []) if (!color.has(next)) { color.set(next, 1 - color.get(cell)!); queue.push(next); } }
      if (component.length < 4) continue;
      for (const shade of [0, 1]) {
        const same = component.filter(i => color.get(i) === shade);
        if (same.some((i, k) => same.slice(k + 1).some(j => sees(i, j)))) { let changed = false; for (const i of same) if (candidates[i].delete(digit)) changed = true; if (changed) return true; }
      }
      const zeros = component.filter(i => color.get(i) === 0), ones = component.filter(i => color.get(i) === 1);
      let changed = false;
      for (let i = 0; i < 81; i++) if (!color.has(i) && candidates[i].has(digit) && zeros.some(z => sees(i, z)) && ones.some(o => sees(i, o))) { candidates[i].delete(digit); changed = true; }
      if (changed) return true;
    }
  }
  return false;
}
/** Solves with the easiest technique first, returning the hardest one used ('beyond' if these techniques cannot finish) and the board reached. */
export function solveWithTechniques(givens: readonly number[]): { technique: Technique; values: number[]; advancedSteps: number; filledAtFirstAdvanced: number | null } {
  const values = [...givens];
  const candidates: Candidates = values.map((value, i) => new Set(value ? [] : DIGITS.filter(digit => !peers(i).some(peer => values[peer] === digit))));
  const place = (index: number, digit: number) => { values[index] = digit; candidates[index].clear(); for (const peer of peers(index)) candidates[peer].delete(digit); };
  let hardest = 0, advancedSteps = 0;
  let filledAtFirstAdvanced: number | null = null;
  const steps: [number, () => boolean][] = [
    [1, () => { for (const house of HOUSES) for (const digit of DIGITS) { const cells = house.filter(i => candidates[i].has(digit)); if (cells.length === 1) { place(cells[0], digit); return true; } } return false; }],
    [2, () => lockedCandidates(candidates)],
    [3, () => sets(candidates, 2)],
    [4, () => sets(candidates, 3)],
    [5, () => xWing(candidates)],
    [6, () => sets(candidates, 4)],
    [7, () => swordfish(candidates)],
    [8, () => xyWing(candidates)],
    [9, () => coloring(candidates)],
  ];
  for (;;) {
    const naked = candidates.findIndex(cell => cell.size === 1);
    if (naked >= 0) { place(naked, [...candidates[naked]][0]); continue; }
    const step = steps.find(([, apply]) => apply());
    if (!step) break;
    hardest = Math.max(hardest, step[0]);
    // Triples and harder count as advanced; the board size when the first one is needed shows how early it comes.
    if (step[0] >= TECHNIQUES.indexOf('triple')) { advancedSteps++; filledAtFirstAdvanced ??= values.filter(Boolean).length; }
  }
  return { technique: values.every(Boolean) ? TECHNIQUES[hardest] : 'beyond', values, advancedSteps, filledAtFirstAdvanced };
}
/** Solvable with the app's techniques, needing only expert-band techniques at most, and meeting EXPERT_RULE. */
export function isExpert(givens: readonly number[]): boolean {
  const { technique, advancedSteps, filledAtFirstAdvanced } = solveWithTechniques(givens);
  return DIFFICULTY_BANDS.expert.includes(technique) && advancedSteps >= EXPERT_RULE.minAdvancedSteps && filledAtFirstAdvanced !== null && filledAtFirstAdvanced <= EXPERT_RULE.maxFilledAtFirstAdvanced;
}
/** The hardest technique a person needs to solve the puzzle. */
export function ratePuzzle(givens: readonly number[]): Technique {
  return solveWithTechniques(givens).technique;
}

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
/** Relabels digits, reorders bands, rows within bands, stacks and columns within stacks, and may transpose. Every technique is unchanged by these moves, so difficulty is preserved. */
export function transformPuzzle(puzzle: Puzzle, seed: number): Puzzle {
  const random = seeded(seed);
  const shuffle = <T,>(items: T[]) => { const out = [...items]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; };
  const lines = () => shuffle([0, 1, 2]).flatMap(band => shuffle([0, 1, 2]).map(line => band * 3 + line));
  const rows = lines(), columns = lines(), digits = [0, ...shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])], transpose = random() < .5;
  const move = (values: readonly number[]) => Array.from({ length: 81 }, (_, i) => {
    const [r, c] = transpose ? [i % 9, Math.floor(i / 9)] : [Math.floor(i / 9), i % 9];
    return digits[values[rows[r] * 9 + columns[c]]];
  });
  return { ...puzzle, givens: move(puzzle.givens), solution: move(puzzle.solution) };
}
/** A stable id for a bank entry (FNV-1a of its givens), so play history survives bank rebuilds that keep the puzzle. */
export function expertKey(entry: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < entry.length; i++) hash = Math.imul(hash ^ entry.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(36);
}
/** An expert puzzle from the precomputed bank, skipping ones in `avoid` until every entry has been seen, solved by technique and given a seeded symmetry so it looks new. */
function createExpertPuzzle(seed: number, avoid: readonly string[]): Puzzle {
  const unseen = EXPERT_BANK.filter(entry => !avoid.includes(expertKey(entry)));
  const pool = unseen.length ? unseen : EXPERT_BANK;
  const entry = pool[seed % pool.length];
  const givens = [...entry].map(Number);
  const puzzle = { id: `${seed}-expert`, difficulty: 'expert' as const, givens, solution: solveWithTechniques(givens).values, source: expertKey(entry) };
  // A symmetry keeps the logic but changes the solver's scan order, which can shorten its path. Serve only variants that still meet the rule.
  for (let attempt = 0; attempt < 20; attempt++) {
    const moved = transformPuzzle(puzzle, (seed + Math.imul(attempt, 0x9e3779b9)) >>> 0);
    if (isExpert(moved.givens)) return moved;
  }
  return puzzle;
}
/** A uniquely solvable puzzle whose rating falls in the difficulty's band, drawing seeded candidates until one fits. */
export function createPuzzle(difficulty: Difficulty, seed = Math.floor(Math.random() * 0xffffffff), { avoid = [] }: { avoid?: readonly string[] } = {}): Puzzle {
  if (difficulty === 'expert') return createExpertPuzzle(seed >>> 0, avoid);
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
