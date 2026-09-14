import { generatePuzzle, type Difficulty } from './sudoku';
self.onmessage = (event: MessageEvent<{ difficulty: Difficulty }>) => {
  try { self.postMessage({ puzzle: generatePuzzle(event.data.difficulty) }); }
  catch { self.postMessage({ error: 'This puzzle could not be created. Please try again.' }); }
};
