import { peers } from './sudoku.ts';
import { BOXES, COLUMNS, DIGITS, HOUSES, ROWS, type Candidates } from './deductions.ts';

/** Human solving techniques, easiest first. A puzzle is rated by the hardest one it needs. */
export const TECHNIQUES = ['naked-single', 'hidden-single', 'locked-candidates', 'pair', 'triple', 'x-wing', 'quad', 'swordfish', 'xy-wing', 'coloring', 'beyond'] as const;
export type Technique = typeof TECHNIQUES[number];

/**
 * One human-sized move. `area` is where to look (a house or the cells a pattern spans), `pattern` holds the
 * cells that force the move, and the move itself is a placement or a list of candidate eliminations.
 */
export type Step = {
  technique: Exclude<Technique, 'beyond'>;
  area: number[];
  pattern: number[];
  digits: number[];
  placement?: { cell: number; digit: number };
  eliminations: { cell: number; digit: number }[];
  /** Naked or hidden sets; pointing (box to line) or claiming (line to box) locked candidates. */
  variant?: 'naked' | 'hidden' | 'pointing' | 'claiming' | 'wrap' | 'trap';
  /** Candidates already removed by an exclusion or earlier elimination that the move relies on, so a hint can point at them. */
  relies: { cell: number; digit: number }[];
  /** Coloring's two shades: one of them holds the digit, the other does not. */
  shades?: [number[], number[]];
};

const boxOf = (i: number) => Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3);
export const sees = (a: number, b: number) => a !== b && (Math.floor(a / 9) === Math.floor(b / 9) || a % 9 === b % 9 || boxOf(a) === boxOf(b));
function subsets<T>(items: readonly T[], size: number): T[][] {
  if (!size) return [[]];
  if (items.length < size) return [];
  const [first, ...rest] = items;
  return [...subsets(rest, size - 1).map(set => [first, ...set]), ...subsets(rest, size)];
}
/** Candidates still present for `digit` in `cells`, as eliminations. */
const removable = (candidates: Candidates, cells: readonly number[], digit: number) => cells.filter(i => candidates[i].has(digit)).map(cell => ({ cell, digit }));

/** Candidates from placed numbers only. */
export function baseCandidates(values: readonly number[]): Candidates {
  return values.map((value, i) => new Set(value ? [] : DIGITS.filter(digit => !peers(i).some(peer => values[peer] === digit))));
}

function nakedSingle(values: readonly number[], candidates: Candidates): Step | null {
  const cell = candidates.findIndex((set, i) => !values[i] && set.size === 1);
  if (cell < 0) return null;
  const digit = [...candidates[cell]][0];
  const seen = new Set(peers(cell).map(peer => values[peer]));
  const relies = DIGITS.filter(d => d !== digit && !seen.has(d)).map(d => ({ cell, digit: d }));
  // One placed copy of each other digit is enough to show why only this digit fits.
  const pattern = DIGITS.filter(d => d !== digit).flatMap(d => peers(cell).filter(peer => values[peer] === d).slice(0, 1));
  return { technique: 'naked-single', area: [cell], pattern, digits: [digit], placement: { cell, digit }, eliminations: [], relies };
}

function hiddenSingle(values: readonly number[], candidates: Candidates): Step | null {
  for (const house of [...BOXES, ...ROWS, ...COLUMNS]) for (const digit of DIGITS) {
    if (house.some(i => values[i] === digit)) continue;
    const cells = house.filter(i => candidates[i].has(digit));
    if (cells.length !== 1) continue;
    // The placed copies of the digit that rule out the other empty cells.
    const others = house.filter(i => !values[i] && i !== cells[0]);
    const blockers = [...new Set(others.flatMap(i => peers(i).filter(peer => values[peer] === digit).slice(0, 1)))];
    const relies = others.filter(i => !peers(i).some(peer => values[peer] === digit)).map(cell => ({ cell, digit }));
    return { technique: 'hidden-single', area: house, pattern: blockers, digits: [digit], placement: { cell: cells[0], digit }, eliminations: [], relies };
  }
  return null;
}

function lockedCandidates(_: readonly number[], candidates: Candidates): Step | null {
  for (const box of BOXES) for (const digit of DIGITS) {
    const cells = box.filter(i => candidates[i].has(digit));
    if (cells.length < 2 || cells.length > 3) continue;
    const rows = new Set(cells.map(i => Math.floor(i / 9))), columns = new Set(cells.map(i => i % 9));
    const line = rows.size === 1 ? ROWS[[...rows][0]] : columns.size === 1 ? COLUMNS[[...columns][0]] : null;
    const eliminations = line ? removable(candidates, line.filter(i => !box.includes(i)), digit) : [];
    if (eliminations.length) return { technique: 'locked-candidates', variant: 'pointing', area: box, pattern: cells, digits: [digit], eliminations, relies: [] };
  }
  for (const line of [...ROWS, ...COLUMNS]) for (const digit of DIGITS) {
    const cells = line.filter(i => candidates[i].has(digit));
    const boxes = new Set(cells.map(boxOf));
    if (cells.length < 2 || cells.length > 3 || boxes.size !== 1) continue;
    const box = BOXES[[...boxes][0]];
    const eliminations = removable(candidates, box.filter(i => !line.includes(i)), digit);
    if (eliminations.length) return { technique: 'locked-candidates', variant: 'claiming', area: line, pattern: cells, digits: [digit], eliminations, relies: [] };
  }
  return null;
}

/** Naked and hidden sets of `size` within any house. */
function sets(candidates: Candidates, size: number, technique: 'pair' | 'triple' | 'quad'): Step | null {
  for (const house of HOUSES) {
    for (const cells of subsets(house.filter(i => candidates[i].size >= 2 && candidates[i].size <= size), size)) {
      const digits = [...new Set(cells.flatMap(i => [...candidates[i]]))];
      if (digits.length !== size) continue;
      const eliminations = house.filter(i => !cells.includes(i)).flatMap(i => digits.filter(digit => candidates[i].has(digit)).map(digit => ({ cell: i, digit })));
      if (eliminations.length) return { technique, variant: 'naked', area: house, pattern: cells, digits: digits.sort(), eliminations, relies: [] };
    }
    for (const digits of subsets(DIGITS, size)) {
      if (digits.some(digit => !house.some(i => candidates[i].has(digit)))) continue;
      const cells = [...new Set(digits.flatMap(digit => house.filter(i => candidates[i].has(digit))))];
      if (cells.length !== size) continue;
      const eliminations = cells.flatMap(i => [...candidates[i]].filter(digit => !digits.includes(digit)).map(digit => ({ cell: i, digit })));
      if (eliminations.length) return { technique, variant: 'hidden', area: house, pattern: cells, digits, eliminations, relies: [] };
    }
  }
  return null;
}

/** X-wing (size 2) and swordfish (size 3): lines where a digit fits only in the same `size` cross lines. */
function fish(candidates: Candidates, size: 2 | 3): Step | null {
  for (const [base, cover] of [[ROWS, COLUMNS], [COLUMNS, ROWS]] as const) for (const digit of DIGITS) {
    const positions = base.map(line => line.flatMap((i, k) => candidates[i].has(digit) ? [k] : []));
    const eligible = [...Array(9).keys()].filter(a => positions[a].length >= 2 && positions[a].length <= size);
    for (const lines of subsets(eligible, size)) {
      const crossing = [...new Set(lines.flatMap(a => positions[a]))];
      if (crossing.length !== size) continue;
      const eliminations = crossing.flatMap(k => removable(candidates, cover[k].filter(i => !lines.some(a => base[a].includes(i))), digit));
      if (eliminations.length) return { technique: size === 2 ? 'x-wing' : 'swordfish', area: lines.flatMap(a => base[a]), pattern: lines.flatMap(a => base[a].filter(i => candidates[i].has(digit))), digits: [digit], eliminations, relies: [] };
    }
  }
  return null;
}

function xyWing(candidates: Candidates): Step | null {
  const bivalue = [...Array(81).keys()].filter(i => candidates[i].size === 2);
  for (const pivot of bivalue) {
    const [a, b] = [...candidates[pivot]];
    const wings = bivalue.filter(i => sees(i, pivot));
    for (const x of wings) for (const y of wings) {
      if (x >= y) continue;
      for (const [p, q] of [[a, b], [b, a]]) {
        if (!candidates[x].has(p) || candidates[x].has(q) || !candidates[y].has(q) || candidates[y].has(p)) continue;
        const c = [...candidates[x]].find(d => d !== p);
        if (c === undefined || !candidates[y].has(c) || c === a || c === b) continue;
        const eliminations = removable(candidates, [...Array(81).keys()].filter(i => i !== x && i !== y && i !== pivot && sees(i, x) && sees(i, y)), c);
        if (eliminations.length) return { technique: 'xy-wing', area: [pivot, x, y], pattern: [pivot, x, y], digits: [a, b, c].sort(), eliminations, relies: [] };
      }
    }
  }
  return null;
}

// Exactly one cell of each conjugate pair holds the digit, so a sound board always 2-colors cleanly; the search can skip already-colored cells without checking for clashes.
/** Single-digit coloring over conjugate pairs (houses with exactly two cells for the digit). */
function coloring(candidates: Candidates): Step | null {
  for (const digit of DIGITS) {
    const links = new Map<number, number[]>();
    for (const house of HOUSES) { const cells = house.filter(i => candidates[i].has(digit)); if (cells.length === 2) { const [p, q] = cells; links.set(p, [...(links.get(p) ?? []), q]); links.set(q, [...(links.get(q) ?? []), p]); } }
    const color = new Map<number, number>();
    for (const start of links.keys()) {
      if (color.has(start)) continue;
      const component: number[] = []; const queue = [start]; color.set(start, 0);
      while (queue.length) { const cell = queue.shift()!; component.push(cell); for (const next of links.get(cell) ?? []) if (!color.has(next)) { color.set(next, 1 - color.get(cell)!); queue.push(next); } }
      if (component.length < 4) continue;
      const shades: [number[], number[]] = [component.filter(i => color.get(i) === 0), component.filter(i => color.get(i) === 1)];
      const step = (eliminations: { cell: number; digit: number }[], variant: 'wrap' | 'trap'): Step => ({ technique: 'coloring', variant, area: component, pattern: component, digits: [digit], eliminations, relies: [], shades });
      for (const shade of [0, 1]) {
        const same = component.filter(i => color.get(i) === shade);
        if (same.some((i, k) => same.slice(k + 1).some(j => sees(i, j)))) { const eliminations = removable(candidates, same, digit); if (eliminations.length) return step(eliminations, 'wrap'); }
      }
      const zeros = component.filter(i => color.get(i) === 0), ones = component.filter(i => color.get(i) === 1);
      const eliminations = removable(candidates, [...Array(81).keys()].filter(i => !color.has(i) && zeros.some(z => sees(i, z)) && ones.some(o => sees(i, o))), digit);
      if (eliminations.length) return step(eliminations, 'trap');
    }
  }
  return null;
}

/** The easiest available move, or null when these techniques find nothing. */
export function findStep(values: readonly number[], candidates: Candidates): Step | null {
  return nakedSingle(values, candidates) ?? hiddenSingle(values, candidates) ?? lockedCandidates(values, candidates)
    ?? sets(candidates, 2, 'pair') ?? sets(candidates, 3, 'triple') ?? fish(candidates, 2) ?? sets(candidates, 4, 'quad')
    ?? fish(candidates, 3) ?? xyWing(candidates) ?? coloring(candidates);
}

/** Applies a step to working state in place. */
export function applyStep(values: number[], candidates: Candidates, step: Step): void {
  if (step.placement) {
    const { cell, digit } = step.placement;
    values[cell] = digit; candidates[cell].clear();
    for (const peer of peers(cell)) candidates[peer].delete(digit);
  }
  for (const { cell, digit } of step.eliminations) candidates[cell].delete(digit);
}
