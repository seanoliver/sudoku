import { useEffect, useLayoutEffect, useRef } from 'react';
import { DIGITS } from '@/lib/deductions';

type NoteProps = { manual: number[]; automatic: number[]; excluded: number[]; boardKey: string };

export function CellNotes({ manual, automatic, excluded, boardKey, filled, focusedDigit = null }: NoteProps & { filled: boolean; focusedDigit?: number | null }) {
  const grid = useRef<HTMLSpanElement>(null);
  const previous = useRef<NoteProps>({ manual, automatic, excluded, boardKey });

  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = { manual, automatic, excluded, boardKey };
    if (filled) {
      grid.current?.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
      return;
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const digit of DIGITS) {
      const wasVisible = before.manual.includes(digit) || before.automatic.includes(digit) || before.excluded.includes(digit);
      const isVisible = manual.includes(digit) || automatic.includes(digit) || excluded.includes(digit);
      if (wasVisible === isVisible) continue;
      const element = grid.current?.children[digit - 1] as HTMLElement | undefined;
      if (!element) continue;
      const running = element.getAnimations();
      const current = running.length ? getComputedStyle(element) : null;
      const opacity = current?.opacity ?? (wasVisible ? '1' : '0');
      const transform = current?.transform ?? (wasVisible ? 'scale(1)' : 'scale(.85)');
      running.forEach(animation => animation.cancel());
      const automaticChange = isVisible ? automatic.includes(digit)
        : before.automatic.includes(digit) || (before.boardKey !== boardKey && before.manual.includes(digit));
      if (reducedMotion || !automaticChange) continue;
      element.animate([
        { opacity, transform },
        { opacity: isVisible ? 1 : 0, transform: isVisible ? 'scale(1)' : 'scale(.85)' },
      ], { duration: isVisible ? 220 : 180, easing: 'ease-out' });
    }
  }, [manual, automatic, excluded, boardKey, filled]);

  useEffect(() => {
    const element = grid.current;
    return () => element?.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
  }, []);

  // Keep glyphs mounted for exit animations; the cell's label describes only current notes.
  return <span className="notes" ref={grid} aria-hidden="true" hidden={filled}>
    {DIGITS.map(digit => <span key={digit} className={`note-digit ${automatic.includes(digit) ? 'note-generated' : ''} ${excluded.includes(digit) ? 'note-excluded' : ''} ${focusedDigit === digit && !excluded.includes(digit) && (manual.includes(digit) || automatic.includes(digit)) ? 'note-focused' : ''}`} data-visible={manual.includes(digit) || automatic.includes(digit) || excluded.includes(digit)}>{digit}</span>)}
  </span>;
}
