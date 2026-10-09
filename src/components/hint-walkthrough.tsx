import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { ExplainLine } from '@/lib/explain';
import { inSentence } from '@/lib/lessons';

type Point = { x: number; y: number; r: number };
type Link = { a: Point; b: Point; current: boolean };

/** Links between linked candidates, drawn between the measured centers of the cells' own note digits. */
export function WalkthroughLinks({ line, wrap }: { line: ExplainLine; wrap: RefObject<HTMLDivElement | null> }) {
  const [drawn, setDrawn] = useState<{ width: number; height: number; links: Link[] }>({ width: 0, height: 0, links: [] });
  useLayoutEffect(() => {
    const element = wrap.current;
    if (!element || !line.links) return;
    const { digit, pairs, newest } = line.links;
    const measure = () => {
      // The SVG fills the padding box, inside the board's border.
      const box = element.getBoundingClientRect(), left = box.left + element.clientLeft, top = box.top + element.clientTop;
      const center = (cell: number): Point | null => {
        const note = element.querySelector(`[data-index="${cell}"] .note-digit[data-digit="${digit}"]`)?.getBoundingClientRect();
        return note ? { x: note.left + note.width / 2 - left, y: note.top + note.height / 2 - top, r: note.width / 2 + 1 } : null;
      };
      const links = pairs.flatMap(([p, q], k) => { const a = center(p), b = center(q); return a && b ? [{ a, b, current: newest && k === pairs.length - 1 }] : []; });
      setDrawn({ width: element.clientWidth, height: element.clientHeight, links });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [line, wrap]);
  if (!line.links || !drawn.links.length) return null;
  return <svg className="walk-links" viewBox={`0 0 ${drawn.width} ${drawn.height}`} aria-hidden="true">
    {drawn.links.map(({ a, b, current }, k) => {
      const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy) || 1, ux = dx / length, uy = dy / length;
      return <line key={k} className={current ? 'current' : ''} x1={a.x + ux * a.r} y1={a.y + uy * a.r} x2={b.x - ux * b.r} y2={b.y - uy * b.r}/>;
    })}
  </svg>;
}

/** Progress, the sentence for the current line, and back and Next to move through the walkthrough. */
export function WalkthroughPanel({ title, index, count, text, onStep, learn }: { title: string; index: number; count: number; text: string; onStep: (index: number, at: number) => void; learn?: { name: string; onOpen: (at: number) => void } }) {
  const last = index >= count - 1;
  const panel = useRef<HTMLDivElement>(null), sentence = useRef<HTMLParagraphElement>(null);
  const [clipped, setClipped] = useState(false);
  useLayoutEffect(() => {
    const fit = () => {
      if (!panel.current || !sentence.current) return;
      const footer = document.querySelector('.lesson-footer')?.getBoundingClientRect().top;
      const limit = (footer ?? innerHeight) - 12 - panel.current.getBoundingClientRect().top;
      panel.current.style.maxHeight = `${Math.max(limit, panel.current.parentElement?.clientHeight ?? 0)}px`;
      const overflows = () => sentence.current!.scrollHeight > sentence.current!.clientHeight + 1;
      delete panel.current.dataset.fit;
      if (overflows()) panel.current.dataset.fit = 'compact';
      setClipped(overflows());
    };
    fit();
    addEventListener('resize', fit);
    return () => removeEventListener('resize', fit);
  }, [text]);
  return <div className="walk-panel" ref={panel}>
    <div className="walk-progress" aria-hidden="true">{Array.from({ length: count }, (_, k) => <i key={k} className={k <= index ? 'done' : ''}/>)}</div>
    <span className="walk-eyebrow">{title} · <span className="walk-count">{index + 1} of {count}</span></span>
    <p ref={sentence} className={clipped ? 'clipped' : ''} tabIndex={clipped ? 0 : undefined}>{text}</p>
    <div className="walk-actions">
      <button className="walk-back" aria-label="Previous step" disabled={index === 0} onClick={event => onStep(index - 1, event.timeStamp)}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {last && learn ? <button className="walk-learn" onClick={event => learn.onOpen(event.timeStamp)}>Learn {inSentence(learn.name)}</button>
        : <button className="walk-next" aria-label="Next step" disabled={last} onClick={event => onStep(index + 1, event.timeStamp)}>Next</button>}
    </div>
  </div>;
}
