import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restorePreferences, DEFAULT_PREFS } from '../src/lib/preferences.ts';

test('deductions default off without resetting existing preferences', () => {
  assert.deepEqual(DEFAULT_PREFS.deductions, { pointingPairs: false, hiddenPairs: false });
  const legacy = { theme: 'dark', showConflicts: false, highlightPeers: false, smartHighlighting: true, autoNotes: true };
  assert.deepEqual(restorePreferences(JSON.stringify(legacy)), { ...legacy, deductions: { pointingPairs: false, hiddenPairs: false } });
});

test('deduction flags restore independently and ignore unknown or malformed values', () => {
  for (const pointingPairs of [true, false]) for (const hiddenPairs of [true, false]) {
    const prefs = { ...DEFAULT_PREFS, deductions: { pointingPairs, hiddenPairs } };
    assert.deepEqual(restorePreferences(JSON.stringify(prefs)), prefs);
  }
  const prefs = { ...DEFAULT_PREFS, deductions: { pointingPairs: 'true', hiddenPairs: true, futureRule: true } };
  assert.deepEqual(restorePreferences(JSON.stringify(prefs)).deductions, { pointingPairs: false, hiddenPairs: true });
  for (const deductions of [undefined, null, true, [], 'true', 1]) {
    assert.deepEqual(restorePreferences(JSON.stringify({ ...DEFAULT_PREFS, deductions })).deductions, { pointingPairs: false, hiddenPairs: false });
  }
  assert.deepEqual(restorePreferences(JSON.stringify({ ...DEFAULT_PREFS, deductions: { pointingPairs: true } })).deductions, { pointingPairs: true, hiddenPairs: false });
});
