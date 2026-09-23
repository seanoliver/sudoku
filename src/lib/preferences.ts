export type Theme = 'system' | 'light' | 'dark';
export type Preferences = { theme: Theme; blockIncorrectAnswers: boolean; highlightPeers: boolean; smartHighlighting: boolean; filterNumberKeys: boolean };
export const PREFS_KEY = 'sudoku.preferences.v1';
export const DEFAULT_PREFS: Preferences = { theme: 'system', blockIncorrectAnswers: true, highlightPeers: true, smartHighlighting: false, filterNumberKeys: false };
export function restorePreferences(raw: string | null): Preferences {
  try {
    const prefs = JSON.parse(raw ?? 'null');
    const blocking = typeof prefs?.blockIncorrectAnswers === 'boolean' ? prefs.blockIncorrectAnswers : prefs?.showConflicts;
    if (prefs && ['system','light','dark'].includes(prefs.theme) && typeof blocking === 'boolean' && typeof prefs.highlightPeers === 'boolean') {
      return { theme: prefs.theme, blockIncorrectAnswers: blocking, highlightPeers: prefs.highlightPeers, smartHighlighting: typeof prefs.smartHighlighting === 'boolean' ? prefs.smartHighlighting : false, filterNumberKeys: typeof prefs.filterNumberKeys === 'boolean' ? prefs.filterNumberKeys : false };
    }
  } catch { /* Preferences are optional; invalid data must never affect a saved game. */ }
  return { ...DEFAULT_PREFS };
}
