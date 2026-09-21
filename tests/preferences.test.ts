import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restorePreferences, DEFAULT_PREFS } from '../src/lib/preferences.ts';

test('retired auto notes and deduction settings cannot re-enable automation', () => {
  const current = { theme: 'dark', blockIncorrectAnswers: false, highlightPeers: false, smartHighlighting: true };
  const legacy = { ...current, autoNotes: true, deductions: { pointingPairs: true, hiddenPairs: true, hiddenSingles: true } };
  assert.deepEqual(restorePreferences(JSON.stringify(legacy)), current);
  assert.equal('autoNotes' in DEFAULT_PREFS, false);
  assert.equal('deductions' in DEFAULT_PREFS, false);
});
