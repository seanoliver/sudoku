import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restorePreferences, DEFAULT_PREFS } from '../src/lib/preferences.ts';

test('retired auto notes and deduction settings cannot re-enable automation', () => {
  const current = { theme: 'dark', blockIncorrectAnswers: false, highlightPeers: false, smartHighlighting: true, filterNumberKeys: false, hideTimer: false };
  const legacy = { ...current, autoNotes: true, deductions: { pointingPairs: true, hiddenPairs: true, hiddenSingles: true } };
  assert.deepEqual(restorePreferences(JSON.stringify(legacy)), current);
  assert.equal('autoNotes' in DEFAULT_PREFS, false);
  assert.equal('deductions' in DEFAULT_PREFS, false);
});

test('timer visibility defaults to visible and persists independently of other preferences', () => {
  assert.equal(DEFAULT_PREFS.hideTimer, false);
  const legacy = { theme: 'dark', blockIncorrectAnswers: false, highlightPeers: false, smartHighlighting: true, filterNumberKeys: true };
  assert.deepEqual(restorePreferences(JSON.stringify(legacy)), { ...legacy, hideTimer: false });
  for (const hideTimer of [true, false]) {
    assert.deepEqual(restorePreferences(JSON.stringify({ ...legacy, hideTimer })), { ...legacy, hideTimer });
  }
  for (const hideTimer of [null, 'true', 1, {}]) {
    assert.equal(restorePreferences(JSON.stringify({ ...legacy, hideTimer })).hideTimer, false);
  }
});
