import { getPlayableCandidates } from './candidates.ts';
import { createGame, fillNotes, type GameState } from './game.ts';
import { LESSON_BANK, type LessonBoard } from './lesson-bank.ts';
import { allSteps, findStep, TECHNIQUES, type Step, type Technique } from './steps.ts';
import type { Difficulty } from './sudoku.ts';

export const LESSONS = ['naked-single', 'hidden-single', 'pointing', 'claiming', 'naked-pair', 'naked-triple', 'naked-quad', 'hidden-pair', 'hidden-triple', 'hidden-quad', 'x-wing', 'swordfish', 'xy-wing', 'color-wrap', 'color-trap'] as const;
export type LessonId = typeof LESSONS[number];

const NAMES: Record<LessonId, string> = {
  'naked-single': 'Naked single', 'hidden-single': 'Hidden single', pointing: 'Pointing pair', claiming: 'Claiming pair',
  'naked-pair': 'Naked pair', 'naked-triple': 'Naked triple', 'naked-quad': 'Naked quad', 'hidden-pair': 'Hidden pair', 'hidden-triple': 'Hidden triple', 'hidden-quad': 'Hidden quad',
  'x-wing': 'X-wing', swordfish: 'Swordfish', 'xy-wing': 'XY-wing', 'color-wrap': 'Color wrap', 'color-trap': 'Color trap',
};
export const lessonName = (id: LessonId) => NAMES[id];
/** The name mid-sentence: "pointing pair", but "X-wing" keeps its capital. */
export const inSentence = (name: string) => /^X/.test(name) ? name : name[0].toLowerCase() + name.slice(1);

/** The lesson that teaches a step. Pointing and claiming triples share the pair lessons. */
export function lessonOf(step: Step): LessonId {
  switch (step.technique) {
    case 'locked-candidates': return step.variant as 'pointing' | 'claiming';
    case 'pair': case 'triple': case 'quad': return `${step.variant}-${step.technique}` as LessonId;
    case 'coloring': return `color-${step.variant}` as LessonId;
    default: return step.technique;
  }
}

export function lessonTechnique(id: LessonId): Exclude<Technique, 'beyond'> {
  if (id === 'pointing' || id === 'claiming') return 'locked-candidates';
  if (id.startsWith('color-')) return 'coloring';
  const set = /^(naked|hidden)-(pair|triple|quad)$/.exec(id);
  return set ? set[2] as 'pair' | 'triple' | 'quad' : id as Exclude<Technique, 'beyond'>;
}

type Mark = { cell: number; digit: number };
export type Grade = { correct: boolean; step: Step };
const key = ({ cell, digit }: Mark) => `${cell}:${digit}`;

/** Same numbers and crossings-out; notes don't count. */
export const sameBoard = (a: GameState, b: GameState) => a.values.every((value, cell) => value === b.values[cell]) && sameExclusions(a, b);
const sameExclusions = (a: GameState, b: GameState) => a.exclusions.every((digits, cell) => digits.length === b.exclusions[cell].length && digits.every(digit => b.exclusions[cell].includes(digit)));

/** Whether the change from `start` to `attempt` is the lesson's move. Notes don't count as a move. */
export function grade(id: LessonId, start: GameState, attempt: GameState): Grade {
  const instances = allSteps(start.values, getPlayableCandidates(start), lessonTechnique(id)).filter(step => lessonOf(step) === id);
  const placed = attempt.values.flatMap((digit, cell) => digit !== start.values[cell] ? [{ cell, digit }] : []);
  const added = new Set(attempt.exclusions.flatMap((digits, cell) => digits.filter(digit => !start.exclusions[cell].includes(digit)).map(digit => key({ cell, digit }))));
  if (placed.length) {
    // Placing digits clears crossings-out (the cell's, and that digit's in its peers), so a placement is judged on the digit alone.
    const match = placed.length === 1 && !added.size ? instances.find(step => step.placement && key(step.placement) === key(placed[0])) : undefined;
    return { correct: Boolean(match), step: match ?? instances[0] };
  }
  const removed = start.exclusions.some((digits, cell) => digits.some(digit => !attempt.exclusions[cell].includes(digit)));
  // One pattern can clear several houses (a naked pair in a row and a box), so crossing out any of its instances' eliminations counts, as long as one instance is complete.
  const covers = (step: Step) => {
    const siblings = instances.filter(other => !other.placement && other.pattern.join() === step.pattern.join() && other.digits.join() === step.digits.join());
    const allowed = new Set(siblings.flatMap(other => other.eliminations.map(key)));
    return step.eliminations.every(mark => added.has(key(mark))) && [...added].every(mark => allowed.has(mark));
  };
  const match = removed || !added.size ? undefined : instances.find(step => !step.placement && covers(step));
  return { correct: Boolean(match), step: match ?? instances[0] };
}

export const LEARNED_KEY = 'sudoku.learned.v1';
export type Learned = Partial<Record<LessonId, string>>;
export function readLearned(raw: string | null): Learned {
  try {
    const data: unknown = JSON.parse(raw ?? '{}');
    if (!data || typeof data !== 'object') return {};
    return Object.fromEntries(Object.entries(data).filter(([id, date]) => (LESSONS as readonly string[]).includes(id) && typeof date === 'string'));
  } catch { return {}; }
}
export const markLearned = (learned: Learned, id: LessonId, date: string): Learned => ({ ...learned, [id]: date });

const digits = (text: string) => [...text].map(Number);
/** A lesson board as a fresh game with every candidate noted and no undo history. */
export function practiceGame(board: LessonBoard, index: number): GameState {
  const base = createGame({ id: `lesson-${board.lesson}-${index}`, difficulty: 'expert', givens: digits(board.givens), solution: digits(board.solution) });
  const game = fillNotes({ ...base, values: digits(board.values), exclusions: board.exclusions.split(',').map(digits) });
  return { ...game, history: [], redoHistory: [] };
}
/** Lessons need an example and at least one practice board. */
export const hasLesson = (id: LessonId) => LESSON_BANK[id].length >= 2;

// Mirrors DIFFICULTY_BANDS (a test keeps them equal); importing it would pull the Expert bank into the page bundle.
const BAND_OF: Record<Exclude<Technique, 'beyond'>, Difficulty> = { 'naked-single': 'easy', 'hidden-single': 'medium', 'locked-candidates': 'hard', pair: 'hard', triple: 'expert', 'x-wing': 'expert', quad: 'expert', swordfish: 'expert', 'xy-wing': 'expert', coloring: 'expert' };
/** Lessons with practice boards, grouped like the puzzle picker, easiest technique first. */
export const LESSON_BANDS: { band: Difficulty; lessons: LessonId[] }[] = (['easy', 'medium', 'hard', 'expert'] as const).map(band => ({
  band,
  lessons: LESSONS.filter(id => hasLesson(id) && BAND_OF[lessonTechnique(id)] === band)
    .sort((a, b) => TECHNIQUES.indexOf(lessonTechnique(a)) - TECHNIQUES.indexOf(lessonTechnique(b)) || LESSONS.indexOf(a) - LESSONS.indexOf(b)),
}));

export type DiagramRole = 'empty' | 'filled' | 'area' | 'pattern' | 'move' | 'gold' | 'blue';
const diagrams = new Map<LessonId, DiagramRole[]>();
/** Per cell, what the lesson's example board shows: the move, then coloring, then the pattern, then the area. */
export function lessonDiagram(id: LessonId): DiagramRole[] {
  const cached = diagrams.get(id);
  if (cached) return cached;
  const game = practiceGame(LESSON_BANK[id][0], 0);
  const step = findStep(game.values, getPlayableCandidates(game))!;
  const moved = new Set([...(step.placement ? [step.placement.cell] : []), ...step.eliminations.map(e => e.cell)]);
  // A hidden set removes candidates inside its own cells, so there the pattern is the thing to show.
  const roles = game.values.map((value, cell): DiagramRole => moved.has(cell) && !(step.variant === 'hidden' && step.pattern.includes(cell)) ? 'move' : step.shades?.[0].includes(cell) ? 'gold' : step.shades?.[1].includes(cell) ? 'blue'
    : step.pattern.includes(cell) ? 'pattern' : step.area.includes(cell) ? 'area' : value ? 'filled' : 'empty');
  diagrams.set(id, roles);
  return roles;
}
