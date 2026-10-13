import { type Difficulty } from './sudoku';
import { createPuzzle, expertCycleComplete } from './difficulty';
// `tag` comes back untouched, so a reply can be matched to the request that made it.
self.onmessage = (event: MessageEvent<{ difficulty: Difficulty; avoid?: string[]; seed?: number; tag?: unknown }>) => {
  const { difficulty, seed, tag } = event.data;
  try { const avoid = event.data.avoid ?? [];
    self.postMessage({ puzzle: createPuzzle(difficulty, seed, { avoid }), newCycle: difficulty === 'expert' && expertCycleComplete(avoid), tag }); }
  catch { self.postMessage({ error: 'This puzzle could not be created. Please try again.', tag }); }
};
