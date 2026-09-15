import { DEDUCTIONS, DEFAULT_DEDUCTIONS, type DeductionSettings } from './deductions.ts';
export type Theme = 'system' | 'light' | 'dark';
export type Preferences = { theme: Theme; showConflicts: boolean; highlightPeers: boolean; smartHighlighting: boolean; autoNotes: boolean; deductions: DeductionSettings };
export const PREFS_KEY = 'sudoku.preferences.v1';
export const DEFAULT_PREFS: Preferences = { theme: 'system', showConflicts: true, highlightPeers: true, smartHighlighting: false, autoNotes: false, deductions: { ...DEFAULT_DEDUCTIONS } };
export function restorePreferences(raw: string | null): Preferences {
  try {
    const prefs = JSON.parse(raw ?? 'null');
    if (prefs && ['system','light','dark'].includes(prefs.theme) && typeof prefs.showConflicts === 'boolean' && typeof prefs.highlightPeers === 'boolean') {
      return { theme: prefs.theme, showConflicts: prefs.showConflicts, highlightPeers: prefs.highlightPeers, smartHighlighting: typeof prefs.smartHighlighting === 'boolean' ? prefs.smartHighlighting : false, deductions: Object.fromEntries(DEDUCTIONS.map(rule => [rule.id, prefs.deductions?.[rule.id] === true])) as DeductionSettings, autoNotes: typeof prefs.autoNotes === 'boolean' ? prefs.autoNotes : false };
    }
  } catch { /* Preferences are optional; invalid data must never affect a saved game. */ }
  return { ...DEFAULT_PREFS, deductions: { ...DEFAULT_DEDUCTIONS } };
}
