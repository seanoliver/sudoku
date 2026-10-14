import type { Replay } from './replay.ts';

/** 0 for the first open cell to get its answer, 1 for the last, null for a starting number. 0.5 for all without a usable replay. */
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
