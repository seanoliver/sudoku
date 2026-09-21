'use client';

import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';

const HOLD_MS = 400;
const MOVE_TOLERANCE = 8;
type Gesture = {
  id: number;
  index: number;
  kind: 'notes' | 'focus';
  x: number;
  y: number;
  startX: number;
  startY: number;
  dragging: boolean;
  cancelled: boolean;
  target: HTMLElement;
  timer?: ReturnType<typeof setTimeout>;
};

/** Temporary annotation selection, separate from the board's keyboard focus. */
export function useNoteSelection({ values, enabled, onSelect, onBegin, onFocus }: {
  values: readonly number[] | undefined;
  enabled: boolean;
  onSelect: (index: number) => void;
  onBegin: () => void;
  onFocus: (input: { index: number; hasSelection: boolean }) => void;
}) {
  const [indices, setIndices] = useState<number[]>([]);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const stopGesture = useCallback(() => {
    const current = gesture.current;
    gesture.current = null;
    if (!current) return;
    clearTimeout(current.timer);
    if (current.target.hasPointerCapture(current.id)) current.target.releasePointerCapture(current.id);
  }, []);
  const reset = useCallback(() => {
    stopGesture();
    setIndices([]);
  }, [stopGesture]);

  useEffect(() => {
    const cancel = () => { suppressClick.current = true; reset(); };
    const visibility = () => { if (document.hidden) cancel(); };
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      stopGesture();
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [reset, stopGesture]);

  const eligible = (index: number) => Boolean(enabled && values && values[index] === 0);
  const add = (index: number) => {
    if (!eligible(index)) return;
    setIndices(current => current.includes(index) ? current : [...current, index]);
    onSelect(index);
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) { suppressClick.current = true; stopGesture(); return; }
    if (!enabled || event.button !== 0) return;
    stopGesture();
    suppressClick.current = false;
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-index]');
    if (!target) return;
    const index = Number(target.dataset.index);
    if (!values || !Number.isInteger(index) || index < 0 || index >= values.length) return;
    target.setPointerCapture(event.pointerId);
    const current: Gesture = {
      id: event.pointerId, index, kind: values[index] ? 'focus' : 'notes', target, x: event.clientX, y: event.clientY,
      startX: event.clientX, startY: event.clientY, dragging: false, cancelled: false,
    };
    current.timer = setTimeout(() => {
      if (gesture.current !== current) return;
      current.dragging = true;
      suppressClick.current = true;
      if (current.kind === 'focus') onFocus({ index, hasSelection: indices.length > 0 });
      else { if (!indices.length) onBegin(); add(index); }
    }, HOLD_MS);
    gesture.current = current;
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId || current.cancelled) return;
    const moved = Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > MOVE_TOLERANCE;
    if (!current.dragging && moved) {
      clearTimeout(current.timer);
      suppressClick.current = true;
      if (current.kind === 'focus' || !indices.length) { current.cancelled = true; return; }
      current.dragging = true;
      add(current.index);
    }
    if (!current.dragging || current.kind === 'focus') return;
    event.preventDefault();
    // Sample the segment so fast drags also select cells between pointer events.
    const steps = Math.max(1, Math.ceil(Math.hypot(event.clientX - current.x, event.clientY - current.y) / 6));
    for (let step = 1; step <= steps; step++) {
      const x = current.x + (event.clientX - current.x) * step / steps;
      const y = current.y + (event.clientY - current.y) * step / steps;
      const cell = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-index]');
      if (cell && event.currentTarget.contains(cell)) add(Number(cell.dataset.index));
    }
    current.x = event.clientX; current.y = event.clientY;
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (gesture.current?.id !== event.pointerId) return;
    suppressClick.current = gesture.current.dragging || gesture.current.cancelled;
    stopGesture();
  };
  const onPointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    if (gesture.current?.id !== event.pointerId) return;
    suppressClick.current = true;
    stopGesture();
  };
  const clickCell = (event: MouseEvent, index: number) => {
    if (!enabled) return;
    // Keyboard / assistive activation has detail 0 and no accompanying pointer gesture.
    if (event.detail !== 0 && suppressClick.current) { suppressClick.current = false; return; }
    if (!indices.length) { onSelect(index); return; }
    if (!eligible(index)) return;
    setIndices(current => current.includes(index) ? current.filter(i => i !== index) : [...current, index]);
    onSelect(index);
  };

  return {
    indices, reset, clickCell,
    pointerHandlers: {
      onPointerDown, onPointerMove, onPointerUp, onPointerCancel,
      onLostPointerCapture: onPointerCancel,
      onContextMenu: (event: MouseEvent<HTMLDivElement>) => event.preventDefault(),
    },
  };
}
