import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restorePreferences, DEFAULT_PREFS } from '../src/lib/preferences.ts';

test('deductions default off without resetting existing preferences', () => {
  assert.deepEqual(DEFAULT_PREFS.deductions, { pointingPairs: false, hiddenPairs: false, hiddenSingles: false });
  const legacy = { theme: 'dark', showConflicts: false, highlightPeers: false, smartHighlighting: true, autoNotes: true };
  assert.deepEqual(restorePreferences(JSON.stringify(legacy)), { ...legacy, deductions: { pointingPairs: false, hiddenPairs: false, hiddenSingles: false } });
});

test('deduction flags restore independently and ignore unknown or malformed values', () => {
  for (const pointingPairs of [true, false]) for (const hiddenPairs of [true, false]) for (const hiddenSingles of [true, false]) {
    const prefs = { ...DEFAULT_PREFS, deductions: { pointingPairs, hiddenPairs, hiddenSingles } };
    assert.deepEqual(restorePreferences(JSON.stringify(prefs)), prefs);
  }
  const prefs = { ...DEFAULT_PREFS, deductions: { pointingPairs: 'true', hiddenPairs: true, futureRule: true } };
  assert.deepEqual(restorePreferences(JSON.stringify(prefs)).deductions, { pointingPairs: false, hiddenPairs: true, hiddenSingles: false });
  for (const deductions of [undefined, null, true, [], 'true', 1]) {
    assert.deepEqual(restorePreferences(JSON.stringify({ ...DEFAULT_PREFS, deductions })).deductions, { pointingPairs: false, hiddenPairs: false, hiddenSingles: false });
  }
  assert.deepEqual(restorePreferences(JSON.stringify({ ...DEFAULT_PREFS, deductions: { pointingPairs: true } })).deductions, { pointingPairs: true, hiddenPairs: false, hiddenSingles: false });
});

test('older two-rule preferences keep both flags and default hidden singles off', () => {
  const old = { ...DEFAULT_PREFS, deductions: { pointingPairs: true, hiddenPairs: true } };
  assert.deepEqual(restorePreferences(JSON.stringify(old)).deductions, { pointingPairs: true, hiddenPairs: true, hiddenSingles: false });
  for (const hiddenSingles of [undefined, null, 'true', 1]) {
    assert.deepEqual(restorePreferences(JSON.stringify({ ...old, deductions: { ...old.deductions, hiddenSingles } })).deductions,
      { pointingPairs: true, hiddenPairs: true, hiddenSingles: false });
  }
});
