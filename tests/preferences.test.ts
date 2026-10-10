import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restorePreferences, DEFAULT_PREFS } from '../src/lib/preferences.ts';

test('retired auto notes and deduction settings cannot re-enable automation', () => {
  const current = { theme: 'dark', blockIncorrectAnswers: false, highlightPeers: false, smartHighlighting: true, filterNumberKeys: false, hideTimer: false, haptics: true };
  const legacy = { ...current, autoNotes: true, deductions: { pointingPairs: true, hiddenPairs: true, hiddenSingles: true } };
  assert.deepEqual(restorePreferences(JSON.stringify(legacy)), current);
  assert.equal('autoNotes' in DEFAULT_PREFS, false);
  assert.equal('deductions' in DEFAULT_PREFS, false);
});

test('timer visibility defaults to visible and persists independently of other preferences', () => {
  assert.equal(DEFAULT_PREFS.hideTimer, false);
  const legacy = { theme: 'dark', blockIncorrectAnswers: false, highlightPeers: false, smartHighlighting: true, filterNumberKeys: true };
  assert.deepEqual(restorePreferences(JSON.stringify(legacy)), { ...legacy, hideTimer: false, haptics: true });
  for (const hideTimer of [true, false]) {
    assert.deepEqual(restorePreferences(JSON.stringify({ ...legacy, hideTimer })), { ...legacy, hideTimer, haptics: true });
  }
  for (const hideTimer of [null, 'true', 1, {}]) {
    assert.equal(restorePreferences(JSON.stringify({ ...legacy, hideTimer })).hideTimer, false);
  }
});

test('a new player starts with every aid on and the timer showing', () => {
  assert.deepEqual(restorePreferences(null), { theme: 'system', blockIncorrectAnswers: true, highlightPeers: true, smartHighlighting: true, filterNumberKeys: true, hideTimer: false, haptics: true });
});

test('an existing player keeps the settings they saved', () => {
  const saved = { theme: 'light', blockIncorrectAnswers: true, highlightPeers: true, smartHighlighting: false, filterNumberKeys: false, hideTimer: false, haptics: true };
  assert.deepEqual(restorePreferences(JSON.stringify(saved)), saved);
});

test('haptics default on, and a saved choice is kept', () => {
  assert.equal(DEFAULT_PREFS.haptics, true);
  const saved = { ...DEFAULT_PREFS, haptics: false };
  assert.equal(restorePreferences(JSON.stringify(saved)).haptics, false);
  for (const haptics of [null, 'false', 0]) assert.equal(restorePreferences(JSON.stringify({ ...DEFAULT_PREFS, haptics })).haptics, true);
});
