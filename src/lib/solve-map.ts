import type { Replay } from './replay.ts';

/**
 * How far through the solve each cell got its final number, from 0 (first) to 1 (last); null for a starting number.
 * Cells are ranked by the step that last changed them to their answer. Without a usable replay every open cell is 0.5.
 */
export function fillOrder({ givens, solution, replay }: { givens: readonly number[]; solution: readonly number[]; replay?: Replay }): (number | null)[] {
  // NaN: never given its answer. A cell already right when the recording began counts as filled before the first step.
  const filledAt: number[] = Array(81).fill(NaN);
  const values: number[] = Array(81).fill(0);
  for (const [i, value] of replay?.start ?? []) { values[i] = value; if (!givens[i] && value === solution[i]) filledAt[i] = -1; }
  replay?.steps.forEach((step, k) => {
    for (const [i, value] of step) {
      if (givens[i] || value === values[i]) continue;
      values[i] = value;
      filledAt[i] = value === solution[i] ? k : NaN;
    }
  });
  const open = givens.flatMap((given, i) => given ? [] : [i]);
  if (!replay || open.some(i => Number.isNaN(filledAt[i]))) return givens.map(given => given ? null : 0.5);
  const ranked = [...open].sort((a, b) => filledAt[a] - filledAt[b] || a - b);
  const rank = Array(81).fill(0);
  ranked.forEach((cell, k) => { rank[cell] = ranked.length > 1 ? k / (ranked.length - 1) : 1; });
  return givens.map((given, i) => given ? null : rank[i]);
}
