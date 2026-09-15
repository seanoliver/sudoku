export type Candidates = Set<number>[];
export const DIGITS = [1,2,3,4,5,6,7,8,9];
const offsets = Array.from({ length: 9 }, (_, i) => i);
export const ROWS = offsets.map(r => offsets.map(c => r * 9 + c));
export const COLUMNS = offsets.map(c => offsets.map(r => r * 9 + c));
export const BOXES = offsets.map(b => offsets.map(i => Math.floor(b / 3) * 27 + b % 3 * 3 + Math.floor(i / 3) * 9 + i % 3));
export const HOUSES = [...ROWS, ...COLUMNS, ...BOXES];

/** Rules remove candidates in place and report whether anything changed. */
export function applyPointingPairs(candidates: Candidates): boolean {
  let changed = false;
  for (const box of BOXES) for (const digit of DIGITS) {
    const cells = box.filter(i => candidates[i].has(digit));
    if (cells.length !== 2) continue;
    const [a, b] = cells;
    const line = Math.floor(a / 9) === Math.floor(b / 9) ? ROWS[Math.floor(a / 9)]
      : a % 9 === b % 9 ? COLUMNS[a % 9] : [];
    for (const i of line) if (!box.includes(i) && candidates[i].delete(digit)) changed = true;
  }
  return changed;
}

export function applyHiddenPairs(candidates: Candidates): boolean {
  let changed = false;
  for (const house of HOUSES) for (const a of DIGITS) {
    const cells = house.filter(i => candidates[i].has(a));
    if (cells.length !== 2) continue;
    for (const b of DIGITS.filter(n => n > a)) {
      const other = house.filter(i => candidates[i].has(b));
      if (other.length !== 2 || other[0] !== cells[0] || other[1] !== cells[1]) continue;
      for (const i of cells) for (const digit of candidates[i]) {
        if (digit !== a && digit !== b) { candidates[i].delete(digit); changed = true; }
      }
    }
  }
  return changed;
}

export const DEDUCTIONS = [
  {
    id: 'pointingPairs',
    title: 'Pointing pairs',
    description: 'If a number has only two possible cells in a box and they share a row or column, remove it from that line outside the box.',
    apply: applyPointingPairs,
  },
  {
    id: 'hiddenPairs',
    title: 'Hidden pairs',
    description: 'If two numbers can only go in the same two cells in a row, column, or box, remove every other possibility from those cells.',
    apply: applyHiddenPairs,
  },
] as const;
export type DeductionId = typeof DEDUCTIONS[number]['id'];
export type DeductionSettings = Record<DeductionId, boolean>;
export const DEFAULT_DEDUCTIONS = Object.fromEntries(DEDUCTIONS.map(rule => [rule.id, false])) as DeductionSettings;
