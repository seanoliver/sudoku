import { baseCandidates, findStep, type Step } from './steps.ts';
import { enter, excludeCandidates, isComplete, type GameState } from './game.ts';

/** What a hint request finds: a wrong number to fix, the easiest next move, no supported move, or a finished board. */
/** A mistake is a wrong number, or (with `digit`) an exclusion that crossed out the cell's answer. */
export type Hint = { kind: 'mistake'; cell: number; digit?: number } | { kind: 'step'; step: Step } | { kind: 'stuck' } | { kind: 'solved' };

/**
 * The easiest supported move from the current board. Notes are ignored because they can be incomplete. Wrong numbers and
 * exclusions of a cell's answer are reported first; otherwise exclusions count, so an applied elimination hint advances the next one.
 */
export function nextHint(game: GameState): Hint {
  if (isComplete(game)) return { kind: 'solved' };
  const cell = game.values.findIndex((value, i) => value && value !== game.solution[i]);
  if (cell >= 0) return { kind: 'mistake', cell };
  // An excluded answer is likely why the player is stuck, so it is reported before any move.
  const excluded = game.exclusions.findIndex((digits, i) => !game.values[i] && digits.includes(game.solution[i]));
  if (excluded >= 0) return { kind: 'mistake', cell: excluded, digit: game.solution[excluded] };
  const candidates = baseCandidates(game.values);
  game.exclusions.forEach((digits, i) => { for (const digit of digits) candidates[i].delete(digit); });
  const step = findStep([...game.values], candidates);
  return step ? { kind: 'step', step } : { kind: 'stuck' };
}

/** Makes the hinted move as one undo step: a placement enters the digit, an elimination records exclusions. */
export function applyHint(game: GameState, step: Step): GameState {
  if (step.placement) return enter(game, { index: step.placement.cell, value: step.placement.digit });
  return excludeCandidates(game, { eliminations: step.eliminations });
}

