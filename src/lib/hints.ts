import { baseCandidates, findStep, type Step } from './steps.ts';
import { enter, excludeCandidates, isComplete, type GameState } from './game.ts';

/** What a hint request finds: a wrong number to fix, the easiest next move, no supported move, or a finished board. */
export type Hint = { kind: 'mistake'; cell: number } | { kind: 'step'; step: Step } | { kind: 'stuck' } | { kind: 'solved' };

/**
 * The easiest supported move from the current board. Notes are ignored because they can be incomplete. Exclusions
 * count only when correct, so an applied elimination hint advances the next one while a mistaken exclusion is ignored.
 */
export function nextHint(game: GameState): Hint {
  if (isComplete(game)) return { kind: 'solved' };
  const cell = game.values.findIndex((value, i) => value && value !== game.solution[i]);
  if (cell >= 0) return { kind: 'mistake', cell };
  const candidates = baseCandidates(game.values);
  game.exclusions.forEach((digits, i) => { for (const digit of digits) if (digit !== game.solution[i]) candidates[i].delete(digit); });
  const step = findStep([...game.values], candidates);
  return step ? { kind: 'step', step } : { kind: 'stuck' };
}

/** Makes the hinted move as one undo step: a placement enters the digit, an elimination records exclusions. */
export function applyHint(game: GameState, step: Step): GameState {
  if (step.placement) return enter(game, { index: step.placement.cell, value: step.placement.digit });
  return excludeCandidates(game, { eliminations: step.eliminations });
}

