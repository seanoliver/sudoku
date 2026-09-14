export type Theme = 'system' | 'light' | 'dark';
export type Preferences = { theme: Theme; showConflicts: boolean; highlightPeers: boolean };
export const PREFS_KEY = 'sudoku.preferences.v1';
export const DEFAULT_PREFS: Preferences = { theme: 'system', showConflicts: true, highlightPeers: true };
export function restorePreferences(raw: string | null): Preferences {
  try {
    const prefs = JSON.parse(raw ?? 'null');
    if (prefs && ['system','light','dark'].includes(prefs.theme) && typeof prefs.showConflicts === 'boolean' && typeof prefs.highlightPeers === 'boolean') {
      return { theme: prefs.theme, showConflicts: prefs.showConflicts, highlightPeers: prefs.highlightPeers };
    }
  } catch { /* Preferences are optional; invalid data must never affect a saved game. */ }
  return { ...DEFAULT_PREFS };
}
