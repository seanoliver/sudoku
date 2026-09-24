import { type Difficulty } from './sudoku';
import { createPuzzle, expertCycleComplete } from './difficulty';
self.onmessage = (event: MessageEvent<{ difficulty: Difficulty; avoid?: string[] }>) => {
  try { const avoid = event.data.avoid ?? [];
    self.postMessage({ puzzle: createPuzzle(event.data.difficulty, undefined, { avoid }), newCycle: event.data.difficulty === 'expert' && expertCycleComplete(avoid) }); }
  catch { self.postMessage({ error: 'This puzzle could not be created. Please try again.' }); }
};
