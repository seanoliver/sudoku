import assert from 'node:assert/strict';
import { createGame, enter, fillNotes, restore, undo } from '../../../src/lib/game.ts';
import { generatePuzzle, getEntryDigits } from '../../../src/lib/sudoku.ts';

// Run against the original behavior, or pass --expect-fixed for the corrected contract.
const expectFixed = process.argv.includes('--expect-fixed');
const initial = createGame(generatePuzzle('hard', 1));
const index = 0;
assert.deepEqual(getEntryDigits({ values: initial.values, index }), [2, 4, 9]);
const note = enter(initial, { index, value: 2, pencil: true });
const exclusion = enter(initial, { index, value: 2, exclude: true });
const scenarios = {
  untouched: initial,
  manualNote: note,
  removedNote: enter(note, { index, value: 2, pencil: true }),
  exclusionOnly: exclusion,
  removedExclusion: enter(exclusion, { index, value: 2, exclude: true }),
  clearedGeneratedNotes: enter(fillNotes(initial), { index, value: 0 }),
  eraseEmptyInValueMode: enter(initial, { index, value: 0 }),
  eraseEmptyInNotesMode: enter(initial, { index, value: 0, pencil: true }),
  eraseEmptyInExcludeMode: enter(initial, { index, value: 0, exclude: true }),
  erasedValue: enter(enter(initial, { index, value: initial.solution[index] }), { index, value: 0 }),
};
const results = Object.entries(scenarios).map(([scenario, game]) => {
  const after = fillNotes(game);
  const reloaded = restore(JSON.stringify(game));
  assert.ok(reloaded);
  assert.deepEqual(fillNotes(reloaded).notes[index], after.notes[index]);
  if (expectFixed) assert.deepEqual(after.notes[index], scenario === 'exclusionOnly' ? [4, 9] : [2, 4, 9]);
  return { scenario, origin: game.noteOrigins[index], before: game.notes[index], exclusions: game.exclusions[index], after: after.notes[index], historyBeforeFill: game.history.length };
});
assert.deepEqual(fillNotes(undo(exclusion)).notes[index], [2, 4, 9]);
assert.deepEqual(fillNotes(scenarios.removedExclusion).notes[index], expectFixed ? [2, 4, 9] : []);
assert.deepEqual(fillNotes(scenarios.eraseEmptyInNotesMode).notes[index], expectFixed ? [2, 4, 9] : []);
assert.deepEqual(fillNotes(scenarios.eraseEmptyInValueMode).notes[index], [2, 4, 9]);
assert.deepEqual(fillNotes(note).notes[index], expectFixed ? [2, 4, 9] : [2]);

let boards = 0;
let emptyCells = 0;
for (const difficulty of ['easy', 'medium', 'hard']) {
  for (let seed = 1; seed <= 100; seed++) {
    let game = createGame(generatePuzzle(difficulty, seed));
    for (const stage of [0, 10]) {
      if (stage) {
        const targets = game.values.flatMap((value, i) => value ? [] : [i]).slice(0, stage);
        for (const i of targets) game = enter(game, { index: i, value: game.solution[i] });
      }
      const after = fillNotes(game);
      boards++;
      for (let i = 0; i < 81; i++) {
        if (game.values[i]) continue;
        emptyCells++;
        const expected = getEntryDigits({ values: game.values, index: i });
        assert.ok(expected.length);
        assert.deepEqual(after.notes[i], expected);
      }
    }
  }
}
console.log(JSON.stringify({ puzzle: initial.id, cell: 'r1c1', legal: [2, 4, 9], results, sample: { boards, emptyCells, unexpectedEmpty: 0 } }, null, 2));
