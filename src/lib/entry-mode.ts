export type EntryMode = 'value' | 'note' | 'exclude';
export type EntryModeState = { mode: EntryMode; batchMode: 'note' | 'exclude' };
export const INITIAL_ENTRY_MODE: EntryModeState = { mode: 'value', batchMode: 'note' };

/** The mode number keys apply now. A batch always annotates. */
export function activeMode(state: EntryModeState, { batch }: { batch: boolean }): EntryMode {
  return batch ? state.batchMode : state.mode;
}
/** A batch annotates in Exclude when Exclude is active, otherwise in Notes. The regular mode is kept. */
export function beginBatch(state: EntryModeState): EntryModeState {
  return { mode: state.mode, batchMode: state.mode === 'exclude' ? 'exclude' : 'note' };
}
/** Numbers during a batch leaves annotation; the caller cancels the selection. */
export function selectMode(state: EntryModeState, { mode, batch }: { mode: EntryMode; batch: boolean }): EntryModeState {
  if (!batch || mode === 'value') return { mode, batchMode: mode === 'value' ? state.batchMode : mode };
  return { mode: state.mode === 'value' ? 'value' : mode, batchMode: mode };
}
export function toggleMode(state: EntryModeState, { mode, batch }: { mode: EntryMode; batch: boolean }): EntryModeState {
  return selectMode(state, { mode: activeMode(state, { batch }) === mode ? 'value' : mode, batch });
}
