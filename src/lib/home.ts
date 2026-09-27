import { isComplete, type GameState } from './game.ts';
import { LESSON_BANDS, type Learned, type LessonId } from './lessons.ts';

export type HomeState = 'new' | 'playing' | 'done';
export const homeState = (game: GameState | null): HomeState => !game ? 'new' : isComplete(game) ? 'done' : 'playing';

/** Share of the originally open cells the player has filled. */
export function percentFilled(game: GameState): number {
  const open = game.givens.filter(value => !value).length;
  return open ? Math.round(game.values.filter((value, i) => value && !game.givens[i]).length / open * 100) : 100;
}

/** The easiest lesson not yet learned, or null once all are. */
export const nextLesson = (learned: Learned): LessonId | null => LESSON_BANDS.flatMap(band => band.lessons).find(id => !learned[id]) ?? null;

/** Whole seconds the clock saved for this game, if it saved any. */
export function savedSeconds(raw: string | null, id: string): number | null {
  try {
    const saved = JSON.parse(raw ?? 'null');
    return saved?.id === id && Number.isFinite(saved.seconds) && saved.seconds >= 0 ? Math.floor(saved.seconds) : null;
  } catch { return null; }
}
