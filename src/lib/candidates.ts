import { conflicts, possibleCells } from './sudoku.ts';
import { BOXES, DEDUCTIONS, DIGITS, HOUSES, type Candidates, type DeductionSettings } from './deductions.ts';

function hasContradiction(values: number[], candidates: Candidates): boolean {
  if (values.some((value, i) => !value && candidates[i].size === 0)) return true;
  return HOUSES.some(house => DIGITS.some(digit =>
    !house.some(i => values[i] === digit || candidates[i].has(digit))));
}

/** Rebuild from placed numbers so disabling rules, erasing, and undo restore possibilities. */
export function getCandidates({ values, deductions = {} }: { values: number[]; deductions?: Partial<DeductionSettings> }): Candidates {
  const basic: Candidates = Array.from({ length: 81 }, () => new Set<number>());
  for (const digit of DIGITS) for (const i of possibleCells(values, digit)) basic[i].add(digit);
  const enabled = DEDUCTIONS.filter(rule => deductions[rule.id]);
  if (!enabled.length || conflicts(values).size || hasContradiction(values, basic)) return basic;
  const candidates = basic.map(cell => new Set(cell));
  let changed: boolean;
  do {
    changed = false;
    for (const rule of enabled) {
      if (rule.apply(candidates)) {
        // Do not propagate deductions from an inconsistent board.
        if (hasContradiction(values, candidates)) return basic;
        changed = true;
      }
    }
  } while (changed);
  return candidates;
}

export function candidateCells(candidates: Candidates, digit: number): Set<number> {
  return new Set(candidates.flatMap((cell, i) => cell.has(digit) ? [i] : []));
}

/** Keep the one-or-two-placements display threshold after deductions have run. */
export function automaticNotes(candidates: Candidates): number[][] {
  const notes: number[][] = Array.from({ length: 81 }, () => []);
  for (const box of BOXES) for (const digit of DIGITS) {
    const cells = box.filter(i => candidates[i].has(digit));
    if (cells.length >= 1 && cells.length <= 2) for (const i of cells) notes[i].push(digit);
  }
  return notes;
}
