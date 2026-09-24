import { buildPuzzle, CLUE_TARGETS, type Difficulty, type Puzzle } from './sudoku.ts';
import { EXPERT_BANK } from './expert-bank.ts';
import { applyStep, baseCandidates, findStep, TECHNIQUES, type Technique } from './steps.ts';

export { TECHNIQUES, type Technique } from './steps.ts';
/** Expert needs repeated advanced reasoning early, not one late trick: at least this many advanced steps, the first while this many cells or fewer are filled. */
export const EXPERT_RULE = { minAdvancedSteps: 3, maxFilledAtFirstAdvanced: 45 } as const;
export const DIFFICULTY_BANDS: Record<Difficulty, readonly Technique[]> = { easy: ['naked-single'], medium: ['hidden-single'], hard: ['locked-candidates', 'pair'], expert: ['triple', 'x-wing', 'quad', 'swordfish', 'xy-wing', 'coloring'] };
// Hard removes every removable clue; the others keep their clue targets.
const GRADED_CLUE_TARGETS: Record<Difficulty, number> = { ...CLUE_TARGETS, hard: 0 }; // expert never generates; it comes from EXPERT_BANK
const MAX_ATTEMPTS = 60;

/** Solves one move at a time, easiest technique first, returning the hardest one used ('beyond' if these techniques cannot finish) and the board reached. */
export function solveWithTechniques(givens: readonly number[]): { technique: Technique; values: number[]; advancedSteps: number; filledAtFirstAdvanced: number | null } {
  const values = [...givens];
  const candidates = baseCandidates(values);
  let hardest = 0, advancedSteps = 0;
  let filledAtFirstAdvanced: number | null = null;
  for (let step = findStep(values, candidates); step; step = findStep(values, candidates)) {
    const rank = TECHNIQUES.indexOf(step.technique);
    hardest = Math.max(hardest, rank);
    // Triples and harder count as advanced; the board size when the first one is needed shows how early it comes.
    if (rank >= TECHNIQUES.indexOf('triple')) { advancedSteps++; filledAtFirstAdvanced ??= values.filter(Boolean).length; }
    applyStep(values, candidates, step);
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
/** True when every current bank puzzle is in `avoid`, so the next Expert puzzle starts a new cycle. */
export const expertCycleComplete = (avoid: readonly string[]) => EXPERT_BANK.every(entry => avoid.includes(expertKey(entry)));
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
