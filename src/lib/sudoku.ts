export type Difficulty = 'easy' | 'medium' | 'hard';
export type Puzzle = { id: string; difficulty: Difficulty; givens: number[]; solution: number[] };
const indexes = Array.from({ length: 81 }, (_, i) => i);
const row = (i: number) => Math.floor(i / 9);
const box = (i: number) => Math.floor(row(i) / 3) * 3 + Math.floor((i % 9) / 3);
const peerTable = indexes.map(i => indexes.filter(j => j !== i && (row(i) === row(j) || i % 9 === j % 9 || box(i) === box(j))));
export function peers(index: number): number[] { return peerTable[index] ?? []; }
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

export function generatePuzzle(difficulty: Difficulty, seed = Math.floor(Math.random() * 0xffffffff)): Puzzle {
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
  const target = { easy: 42, medium: 34, hard: 28 }[difficulty];
  let remaining = 81;
  for (const i of shuffle(indexes)) {
    if (remaining <= target) break;
    const saved = givens[i]; givens[i] = 0;
    if (countSolutions(givens) !== 1) givens[i] = saved;
    else remaining--;
  }
  return { id: `${seed}-${difficulty}`, difficulty, givens, solution };
}
