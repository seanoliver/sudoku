import { Icon } from './icons';
import type { Action, Recovery } from '@/lib/undo-description';

const ICONS = { number: 'numbers', notes: 'pencil', exclusion: 'exclude' } as const;

function MiniBoard({ cells }: { cells: readonly number[] }) {
  const on = new Set(cells);
  return <span className="undo-mini">{Array.from({ length: 81 }, (_, i) => <span key={i} className={on.has(i) ? 'on' : undefined}/>)}</span>;
}

export function UndoSummary({ recovery: { direction, action } }: { recovery: Recovery }) {
  return <span className={`undo-summary undo-${action.kind}`} aria-hidden="true">
    <Icon name="undo" size={17} style={direction === 'redo' ? { transform: 'scaleX(-1)' } : undefined}/>
    <MiniBoard cells={action.cells}/>
    <span className="undo-kind"><Icon name={ICONS[action.kind]} size={15}/>{action.cells.length}</span>
  </span>;
}

export const flashClass = (action: Action) => `undo-flash undo-${action.kind}`;
