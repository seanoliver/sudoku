import { generatePuzzle, countSolutions, peers } from '../../../src/lib/sudoku.ts';
import { HOUSES, ROWS, COLUMNS, BOXES, DIGITS } from '../../../src/lib/deductions.ts';
type C = Set<number>[];
const boxOf = (i: number) => Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3);
// Locked candidates: pointing (box -> line) and claiming (line -> box), 2 or 3 cells.
function locked(c: C) { let ch = false;
  for (const box of BOXES) for (const d of DIGITS) { const cells = box.filter(i => c[i].has(d)); if (cells.length < 2 || cells.length > 3) continue;
    const rs = new Set(cells.map(i => Math.floor(i / 9))), cs = new Set(cells.map(i => i % 9));
    const line = rs.size === 1 ? ROWS[[...rs][0]] : cs.size === 1 ? COLUMNS[[...cs][0]] : null;
    if (line) for (const i of line) if (!box.includes(i) && c[i].delete(d)) ch = true; }
  for (const line of [...ROWS, ...COLUMNS]) for (const d of DIGITS) { const cells = line.filter(i => c[i].has(d)); if (cells.length < 2 || cells.length > 3) continue;
    const bs = new Set(cells.map(boxOf)); if (bs.size !== 1) continue; for (const i of BOXES[[...bs][0]]) if (!line.includes(i) && c[i].delete(d)) ch = true; }
  return ch; }
function subsets<T>(a: T[], k: number): T[][] { if (k === 0) return [[]]; if (a.length < k) return []; const [h, ...t] = a; return [...subsets(t, k - 1).map(s => [h, ...s]), ...subsets(t, k)]; }
function nakedSets(c: C, k: number) { let ch = false;
  for (const house of HOUSES) { const open = house.filter(i => c[i].size >= 2 && c[i].size <= k);
    for (const set of subsets(open, k)) { const u = new Set(set.flatMap(i => [...c[i]])); if (u.size !== k) continue;
      for (const i of house) if (!set.includes(i)) for (const d of u) if (c[i].delete(d)) ch = true; } }
  return ch; }
function hiddenSets(c: C, k: number) { let ch = false;
  for (const house of HOUSES) for (const ds of subsets(DIGITS, k)) { const cells = [...new Set(ds.flatMap(d => house.filter(i => c[i].has(d))))];
    if (cells.length !== k || ds.some(d => !house.some(i => c[i].has(d)))) continue;
    for (const i of cells) for (const d of [...c[i]]) if (!ds.includes(d) && c[i].delete(d)) ch = true; }
  return ch; }
function xwing(c: C) { let ch = false;
  for (const [base, cover] of [[ROWS, COLUMNS], [COLUMNS, ROWS]] as const) for (const d of DIGITS) {
    const pos = base.map(line => line.map((i, k) => c[i].has(d) ? k : -1).filter(k => k >= 0));
    for (let a = 0; a < 9; a++) for (let b = a + 1; b < 9; b++) { if (pos[a].length !== 2 || pos[b].length !== 2 || pos[a][0] !== pos[b][0] || pos[a][1] !== pos[b][1]) continue;
      for (const k of pos[a]) for (const i of cover[k]) if (!base[a].includes(i) && !base[b].includes(i) && c[i].delete(d)) ch = true; } }
  return ch; }
const TECH = ['naked single', 'hidden single', 'locked candidates', 'naked/hidden pair', 'naked/hidden triple', 'x-wing', 'needs more'];
export function grade(givens: number[]) {
  const v = [...givens]; const c: C = v.map((x, i) => new Set(x ? [] : DIGITS.filter(d => !peers(i).some(j => v[j] === d))));
  const place = (i: number, d: number) => { v[i] = d; c[i].clear(); for (const j of peers(i)) c[j].delete(d); };
  let level = 0;
  for (;;) {
    const n = c.findIndex(s => s.size === 1); if (n >= 0) { place(n, [...c[n]][0]); continue; }
    let h = false; for (const house of HOUSES) { for (const d of DIGITS) { const cells = house.filter(i => c[i].has(d)); if (cells.length === 1) { place(cells[0], d); h = true; break; } } if (h) break; }
    if (h) { level = Math.max(level, 1); continue; }
    if (locked(c)) { level = Math.max(level, 2); continue; }
    if (nakedSets(c, 2) || hiddenSets(c, 2)) { level = Math.max(level, 3); continue; }
    if (nakedSets(c, 3) || hiddenSets(c, 3)) { level = Math.max(level, 4); continue; }
    if (xwing(c)) { level = Math.max(level, 5); continue; }
    break;
  }
  return v.every(Boolean) ? level : 6;
}
function generate(target: number, seed: number) {
  const p = generatePuzzle('hard', seed);
  let state = (seed ^ 0x9e3779b9) >>> 0;
  const random = () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const order = [...Array(81).keys()].sort(() => random() - .5);
  const g = [...p.solution]; let r = 81;
  for (const i of order) { if (r <= target) break; const s = g[i]; g[i] = 0; if (countSolutions(g) !== 1) g[i] = s; else r--; }
  return g;
}
const N = Number(process.argv[2] ?? 150);
const run = (name: string, make: (s: number) => number[]) => { const h = Array(7).fill(0); for (let s = 1; s <= N; s++) h[grade(make(s * 7919))]++; console.log(name.padEnd(10) + TECH.map((t, i) => `${t}: ${(h[i] / N * 100).toFixed(0)}%`).join(' | ')); };
for (const d of ['easy', 'medium', 'hard'] as const) run(d, s => generatePuzzle(d, s).givens);
run('minimal', s => generate(0, s));
