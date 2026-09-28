'use client';
import { readReplays, recordBoard, REPLAYS_KEY, serializeReplays, type Board, type Replays } from '@/lib/replay';
import type { GameState } from '@/lib/game';

// Recordings live outside React so every move can add to them, and components read them through useSyncExternalStore.
const EMPTY: Replays = [];
const SAVE_DELAY_MS = 400;
let cache: Replays | null = null;
const lastBoards = new Map<string, Board>();
const listeners = new Set<() => void>();
let saveTimer: number | undefined;
const unsaved = new Set<string>();
let watching = false;

const notify = () => listeners.forEach(listener => listener());
const save = () => {
  clearTimeout(saveTimer); saveTimer = undefined;
  if (!unsaved.size || !cache) return;
  unsaved.clear();
  try { localStorage.setItem(REPLAYS_KEY, serializeReplays(cache)); } catch { /* Replays are optional. */ }
};
function watch() {
  if (watching || typeof window === 'undefined') return;
  watching = true;
  // Moves are saved in batches; leaving or hiding the page saves at once so nothing is lost.
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  // Keep this tab's unsaved games: another tab's copy doesn't have them.
  window.addEventListener('storage', event => {
    if (event.key !== REPLAYS_KEY) return;
    const mine = (cache ?? []).filter(replay => unsaved.has(replay.id));
    cache = [...readReplays(event.newValue).filter(replay => !unsaved.has(replay.id)), ...mine];
    for (const id of [...lastBoards.keys()]) if (!unsaved.has(id)) lastBoards.delete(id);
    notify();
  });
}
const load = (): Replays => {
  if (cache === null) { watch(); try { cache = readReplays(localStorage.getItem(REPLAYS_KEY)); } catch { cache = []; } }
  return cache;
};

export const replayStore = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  snapshot: load,
  serverSnapshot: () => EMPTY,
  record(id: string, game: Pick<GameState, 'values' | 'notes' | 'exclusions' | 'noteOrigins'>, { restart = false }: { restart?: boolean } = {}) {
    const board: Board = { values: game.values, notes: game.notes, exclusions: game.exclusions, generated: game.noteOrigins.map(origin => origin === 'generated') };
    const next = recordBoard(load(), id, board, { restart, last: restart ? undefined : lastBoards.get(id) });
    lastBoards.set(id, board);
    if (next === cache) return;
    cache = next;
    unsaved.add(id);
    saveTimer ??= window.setTimeout(save, SAVE_DELAY_MS);
    notify();
  },
};
