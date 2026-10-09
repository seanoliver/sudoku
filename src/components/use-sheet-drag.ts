import { useRef, type PointerEvent } from 'react';
import { closesOnRelease, type Sample } from '@/lib/sheet-drag';

type Sheet = PointerEvent<HTMLDialogElement>;

/** Pointer handlers for the sheet: dragging its handle down far or fast enough closes it, anything less springs it back. */
export function useSheetDrag(onDismiss: () => void) {
  const drag = useRef<{ id: number; startY: number; previous: Sample; last: Sample } | null>(null);
  const offset = (y: number) => { const dy = y - drag.current!.startY; return dy > 0 ? dy : dy / 4; };
  const reset = (sheet: HTMLDialogElement) => { drag.current = null; delete sheet.dataset.dragging; };
  const cancel = (event: Sheet) => {
    if (drag.current?.id !== event.pointerId) return;
    reset(event.currentTarget);
    event.currentTarget.style.translate = '';
  };
  return {
    onPointerDown: (event: Sheet) => {
      const sheet = event.currentTarget;
      if (!(event.target as Element).closest('.sheet-handle') || sheet.dataset.kind === 'restart') return;
      // A mouse drag would otherwise select text and scroll the sheet out from under the pointer.
      event.preventDefault();
      const sample = { y: event.clientY, at: event.timeStamp };
      drag.current = { id: event.pointerId, startY: event.clientY, previous: sample, last: sample };
      (event.target as Element).setPointerCapture(event.pointerId);
      sheet.dataset.dragging = '';
    },
    onPointerMove: (event: Sheet) => {
      const current = drag.current;
      if (!current || current.id !== event.pointerId) return;
      if (!event.buttons) { cancel(event); return; }
      event.currentTarget.style.translate = `0 ${offset(event.clientY)}px`;
      current.previous = current.last;
      current.last = { y: event.clientY, at: event.timeStamp };
    },
    onPointerUp: (event: Sheet) => {
      const current = drag.current;
      if (!current || current.id !== event.pointerId) return;
      const distance = offset(event.clientY);
      reset(event.currentTarget);
      // The release repeats the last move's position, so speed comes from the two moves before it.
      if (closesOnRelease({ distance, previous: current.previous, last: current.last })) onDismiss();
      else event.currentTarget.style.translate = '';
    },
    onPointerCancel: cancel,
    reset,
  };
}
