import type { GameState } from './game.ts';

type Board = Pick<GameState, 'values' | 'notes' | 'exclusions' | 'noteOrigins'>;
export type ActionKind = 'number' | 'notes' | 'exclusion';
export type Action = { kind: ActionKind; cells: number[] };
export type Recovery = { direction: 'undo' | 'redo'; action: Action };

const sameDigits = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every(digit => b.includes(digit));

/**
 * `before` must be the earlier board: the kind depends on which exclusions were gained.
 * A number counts only cells whose number changed, not the peers whose notes it cleared.
 */
export function describeAction(before: Board, after: Board): Action | null {
  const numbers: number[] = [], marks: number[] = [];
  let gainedExclusion = false, notesChanged = false, exclusionsChanged = false;
  for (let i = 0; i < 81; i++) {
    if (before.values[i] !== after.values[i]) numbers.push(i);
    const notes = !sameDigits(before.notes[i], after.notes[i]), exclusions = !sameDigits(before.exclusions[i], after.exclusions[i]);
    if (notes || exclusions || before.noteOrigins[i] !== after.noteOrigins[i]) marks.push(i);
    notesChanged ||= notes;
    exclusionsChanged ||= exclusions;
    gainedExclusion ||= after.exclusions[i].some(digit => !before.exclusions[i].includes(digit));
  }
  if (numbers.length) return { kind: 'number', cells: numbers };
  if (!marks.length) return null;
  return { kind: gainedExclusion || (exclusionsChanged && !notesChanged) ? 'exclusion' : 'notes', cells: marks };
}

const NOUNS: Record<ActionKind, [one: string, many: string]> = { number: ['a number', 'numbers'], notes: ['notes', 'notes'], exclusion: ['an exclusion', 'exclusions'] };
export function announce({ direction, action: { kind, cells } }: Recovery): string {
  const count = cells.length;
  return `${direction === 'undo' ? 'Undid' : 'Redid'} ${NOUNS[kind][count === 1 ? 0 : 1]} in ${count} ${count === 1 ? 'cell' : 'cells'}`;
}
