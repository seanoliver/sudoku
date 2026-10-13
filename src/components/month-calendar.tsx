'use client';
import type { ReactNode } from 'react';
import { monthGrid } from '@/lib/solves';
import { Icon } from './icons';

export const dateOf = (day: string) => { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d); };

/** A month of days, `offset` months before today's, with buttons to page back and forward up to today's month. */
export function MonthCalendar({ today, offset, onOffset, day }: { today: string; offset: number; onOffset: (offset: number) => void; day: (day: string) => ReactNode }) {
  const now = dateOf(today);
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const grid = monthGrid(month.getFullYear(), month.getMonth());
  const monthName = month.toLocaleDateString('en-US', month.getFullYear() === now.getFullYear() ? { month: 'long' } : { month: 'long', year: 'numeric' });
  return <section className="history-calendar" aria-labelledby="history-month">
    <div className="history-month">
      <button aria-label="Previous month" onClick={() => onOffset(offset - 1)}><Icon name="chevron" size={16}/></button>
      <h2 id="history-month" aria-live="polite">{monthName}</h2>
      <button aria-label="Next month" aria-disabled={offset === 0} onClick={() => { if (offset < 0) onOffset(offset + 1); }}><Icon name="chevron" size={16}/></button>
    </div>
    <div className="history-week" aria-hidden="true">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, k) => <span key={k}>{d}</span>)}</div>
    <div className="history-days">
      {Array.from({ length: grid.lead }, (_, k) => <span key={`lead${k}`}/>)}
      {grid.days.map(day)}
    </div>
  </section>;
}
