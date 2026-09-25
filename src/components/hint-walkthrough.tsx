import type { ExplainLine } from '@/lib/explain';
import { inSentence } from '@/lib/lessons';

/** Center of a candidate's slot in the notes grid, in board units (one cell = 1). The grid is 84% of the cell, inset 8%. */
const noteAt = (cell: number, digit: number) => ({
  x: cell % 9 + .08 + .84 * ((digit - 1) % 3 + .5) / 3,
  y: Math.floor(cell / 9) + .08 + .84 * (Math.floor((digit - 1) / 3) + .5) / 3,
});

/** Links, candidate chips and strikes for one walkthrough line, drawn over the board. */
export function WalkthroughOverlay({ line }: { line: ExplainLine }) {
  const struck = new Set(line.strike?.map(({ cell, digit }) => `${cell}-${digit}`));
  const chips = [...(line.chips ?? []), ...(line.strike ?? []).filter(mark => !line.chips?.some(chip => chip.cell === mark.cell && chip.digit === mark.digit))];
  const { links } = line;
  return <svg className="walk-overlay" viewBox="0 0 9 9" preserveAspectRatio="none" aria-hidden="true">
    {links?.pairs.map(([p, q], k) => {
      const a = noteAt(p, links.digit), b = noteAt(q, links.digit);
      return <line key={`${p}-${q}`} className={links.newest && k === links.pairs.length - 1 ? 'current' : ''} x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>;
    })}
    {chips.map(({ cell, digit }) => {
      const { x, y } = noteAt(cell, digit), cross = struck.has(`${cell}-${digit}`);
      return <g key={`${cell}-${digit}`} className={`walk-chip ${cross ? 'struck' : ''}`}>
        <rect x={x - .15} y={y - .15} width=".3" height=".3" rx=".08"/>
        <text x={x} y={y + .008}>{digit}</text>
        {cross && <line className="walk-strike" x1={x - .14} y1={y - .14} x2={x + .14} y2={y + .14}/>}
      </g>;
    })}
  </svg>;
}

/** The sentence for the current line, with ‹ › to move through the walkthrough. */
export function WalkthroughPanel({ index, count, text, onStep, learn }: { index: number; count: number; text: string; onStep: (index: number, at: number) => void; learn?: { name: string; onOpen: () => void } }) {
  return <div className="walk-panel">
    <div className="walk-panel-head">
      <strong>Why this works</strong>
      <div className="walk-stepper">
        <button aria-label="Previous step" disabled={index === 0} onClick={event => onStep(index - 1, event.timeStamp)}>‹</button>
        <span>{index + 1} of {count}</span>
        <button aria-label="Next step" disabled={index >= count - 1} onClick={event => onStep(index + 1, event.timeStamp)}>›</button>
      </div>
    </div>
    <p>{text}</p>
    {learn && <button className="walk-learn" onClick={learn.onOpen}>Learn {inSentence(learn.name)} ›</button>}
  </div>;
}
