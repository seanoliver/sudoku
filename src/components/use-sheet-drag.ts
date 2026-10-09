import { useEffect, type RefObject } from 'react';

const CLOSE_DISTANCE = 100;
const CLOSE_SPEED = 0.5;

/** Lets a finger drag the sheet down by its handle: far or fast enough closes it, anything less springs it back. */
export function useSheetDrag(dialog: RefObject<HTMLDialogElement | null>, onDismiss: () => void) {
  useEffect(() => {
    const sheet = dialog.current;
    if (!sheet) return;
    let start: { id: number; y: number; at: number } | null = null, last = { y: 0, at: 0 };
    const offset = (y: number) => { const dy = y - start!.y; return dy > 0 ? dy : dy / 4; };
    const down = (event: PointerEvent) => {
      if (!(event.target as Element).closest('.sheet-handle') || sheet.dataset.kind === 'restart') return;
      start = { id: event.pointerId, y: event.clientY, at: event.timeStamp };
      last = { y: event.clientY, at: event.timeStamp };
      (event.target as Element).setPointerCapture(event.pointerId);
      sheet.dataset.dragging = '';
    };
    const move = (event: PointerEvent) => {
      if (start?.id !== event.pointerId) return;
      sheet.style.translate = `0 ${offset(event.clientY)}px`;
      last = { y: event.clientY, at: event.timeStamp };
    };
    const up = (event: PointerEvent) => {
      if (start?.id !== event.pointerId) return;
      const distance = offset(event.clientY), speed = (event.clientY - last.y) / Math.max(1, event.timeStamp - last.at);
      start = null;
      delete sheet.dataset.dragging;
      if (distance > CLOSE_DISTANCE || (distance > 0 && speed > CLOSE_SPEED)) onDismiss();
      else sheet.style.translate = '';
    };
    sheet.addEventListener('pointerdown', down);
    sheet.addEventListener('pointermove', move);
    sheet.addEventListener('pointerup', up);
    sheet.addEventListener('pointercancel', up);
    return () => {
      sheet.removeEventListener('pointerdown', down);
      sheet.removeEventListener('pointermove', move);
      sheet.removeEventListener('pointerup', up);
      sheet.removeEventListener('pointercancel', up);
    };
  }, [dialog, onDismiss]);
}
