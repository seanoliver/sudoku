'use client';
import { readReplays, recordBoard, REPLAYS_KEY, serializeReplays, type Board, type Replays } from '@/lib/replay';

// Recordings live outside React so every move can add to them, and components read them through useSyncExternalStore.
const EMPTY: Replays = [];
let cache: Replays | null = null;
const listeners = new Set<() => void>();
const load = (): Replays => {
  if (cache === null) { try { cache = readReplays(localStorage.getItem(REPLAYS_KEY)); } catch { cache = []; } }
  return cache;
};

export const replayStore = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  snapshot: load,
  serverSnapshot: () => EMPTY,
  record(id: string, board: Board, options?: { restart?: boolean }) {
    const next = recordBoard(load(), id, board, options);
    if (next === cache) return;
    cache = next;
    try { localStorage.setItem(REPLAYS_KEY, serializeReplays(next)); } catch { /* Replays are optional. */ }
    listeners.forEach(listener => listener());
  },
};
