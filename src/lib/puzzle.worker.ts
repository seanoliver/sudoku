import { type Difficulty } from './sudoku';
import { createPuzzle } from './difficulty';
import { EXPERT_BANK } from './expert-bank';
self.onmessage = (event: MessageEvent<{ difficulty: Difficulty; avoid?: string[] }>) => {
  try { self.postMessage({ puzzle: createPuzzle(event.data.difficulty, undefined, { avoid: event.data.avoid ?? [] }), bankSize: EXPERT_BANK.length }); }
  catch { self.postMessage({ error: 'This puzzle could not be created. Please try again.' }); }
};
