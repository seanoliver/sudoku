import { type Difficulty } from './sudoku';
import { createPuzzle } from './difficulty';
self.onmessage = (event: MessageEvent<{ difficulty: Difficulty }>) => {
  try { self.postMessage({ puzzle: createPuzzle(event.data.difficulty) }); }
  catch { self.postMessage({ error: 'This puzzle could not be created. Please try again.' }); }
};
