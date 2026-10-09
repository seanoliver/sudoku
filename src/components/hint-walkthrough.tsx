import { useLayoutEffect, useState, type RefObject } from 'react';
import type { ExplainLine } from '@/lib/explain';
import { inSentence } from '@/lib/lessons';

type Point = { x: number; y: number };
type Link = { a: Point; b: Point; current: boolean };
const NOTE_RADIUS = 7;

/** Links between linked candidates, drawn between the measured centers of the cells' own note digits. */
export function WalkthroughLinks({ line, wrap }: { line: ExplainLine; wrap: RefObject<HTMLDivElement | null> }) {
  const [drawn, setDrawn] = useState<{ width: number; height: number; links: Link[] }>({ width: 0, height: 0, links: [] });
  useLayoutEffect(() => {
    const element = wrap.current;
    if (!element || !line.links) return;
    const { digit, pairs, newest } = line.links;
    const measure = () => {
      const box = element.getBoundingClientRect();
      const center = (cell: number): Point | null => {
        const note = element.querySelector(`[data-index="${cell}"] .note-digit[data-digit="${digit}"]`)?.getBoundingClientRect();
        return note ? { x: note.left + note.width / 2 - box.left, y: note.top + note.height / 2 - box.top } : null;
      };
      const links = pairs.flatMap(([p, q], k) => { const a = center(p), b = center(q); return a && b ? [{ a, b, current: newest && k === pairs.length - 1 }] : []; });
      setDrawn({ width: box.width, height: box.height, links });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [line, wrap]);
  if (!line.links || !drawn.links.length) return null;
  return <svg className="walk-links" viewBox={`0 0 ${drawn.width} ${drawn.height}`} aria-hidden="true">
    {drawn.links.map(({ a, b, current }, k) => {
      const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy) || 1, ux = dx / length * NOTE_RADIUS, uy = dy / length * NOTE_RADIUS;
      return <line key={k} className={current ? 'current' : ''} x1={a.x + ux} y1={a.y + uy} x2={b.x - ux} y2={b.y - uy}/>;
    })}
  </svg>;
}

/** Progress, the sentence for the current line, and back and Next to move through the walkthrough. */
export function WalkthroughPanel({ title, index, count, text, onStep, learn }: { title: string; index: number; count: number; text: string; onStep: (index: number, at: number) => void; learn?: { name: string; onOpen: () => void } }) {
  const last = index >= count - 1;
  return <div className="walk-panel">
    <div className="walk-progress" aria-hidden="true">{Array.from({ length: count }, (_, k) => <i key={k} className={k <= index ? 'done' : ''}/>)}</div>
    <span className="walk-eyebrow">{title} · <span className="walk-count">{index + 1} of {count}</span></span>
    <p>{text}</p>
    <div className="walk-actions">
      <button className="walk-back" aria-label="Previous step" disabled={index === 0} onClick={event => onStep(index - 1, event.timeStamp)}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {last && learn ? <button className="walk-learn" onClick={learn.onOpen}>Learn {inSentence(learn.name)}</button>
        : <button className="walk-next" aria-label="Next step" disabled={last} onClick={event => onStep(index + 1, event.timeStamp)}>Next</button>}
    </div>
  </div>;
}
