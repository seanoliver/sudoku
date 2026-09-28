'use client';
import { useEffect, useRef, useState } from 'react';
import { dayKey, levelStats, monthGrid, streak, type Solve } from '@/lib/solves';
import type { Difficulty } from '@/lib/sudoku';
import { LevelTiles } from './home';
import { Icon } from './icons';

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
const PAGE = 30;
const capital = (text: string) => text[0].toUpperCase() + text.slice(1);
const pad = (n: number) => n.toString().padStart(2, '0');
export const solveTime = (seconds: number) => {
  const s = Math.floor(seconds);
  return s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` : `${Math.floor(s / 60)}:${pad(s % 60)}`;
};
const dateOf = (day: string) => { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d); };

/** The starting board as a pattern: a filled square for each starting number, in the level's color. */
function Pattern({ givens }: { givens: string }) {
  return <svg className="history-pattern" width="46" height="46" viewBox="0 0 9 9" aria-hidden="true">
    <rect width="9" height="9" rx=".5" className="history-pattern-bg"/>
    {[...givens].map((v, i) => v !== '0' ? <rect key={i} x={i % 9 + .12} y={Math.floor(i / 9) + .12} width=".76" height=".76" rx=".18" className="history-pattern-given"/> : null)}
    {[3, 6].map(k => <g key={k}><line x1={k} y1="0" x2={k} y2="9"/><line x1="0" y1={k} x2="9" y2={k}/></g>)}
  </svg>;
}

export function HistoryPage({ solves, total: counted, today: opened, hideTimer, onExit }: { solves: Solve[]; total: number; today: string; hideTimer: boolean; onExit: () => void }) {
  // `total` counts each Expert puzzle once, so it can be lower than the solves listed.
  const total = Math.max(counted, solves.length);
  const [today, setToday] = useState(opened);
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const timer = window.setTimeout(() => setToday(dayKey(new Date())), midnight + 50);
    return () => clearTimeout(timer);
  }, [today]);
  const list = useRef<HTMLOListElement>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const now = dateOf(today);
  const month = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const grid = monthGrid(month.getFullYear(), month.getMonth());
  const monthName = month.toLocaleDateString('en-US', month.getFullYear() === now.getFullYear() ? { month: 'long' } : { month: 'long', year: 'numeric' });
  const byDay = new Map<string, Solve[]>();
  for (const solve of solves) byDay.set(solve.day, [...byDay.get(solve.day) ?? [], solve]);
  const stats = levelStats(solves);
  const days = streak(solves, today);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const when = (day: string) => {
    const date = dateOf(day);
    if (day === today) return 'Today';
    if (date.getTime() === yesterday.getTime()) return 'Yesterday';
    return date.toLocaleDateString('en-US', date.getFullYear() === now.getFullYear() ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const listed = selected ? byDay.get(selected) ?? [] : solves;
  const earlier = total - solves.length;
  return <>
    <header className="app-bar lesson-bar">
      <button className="lesson-back" onClick={onExit}><Icon name="chevron" size={16}/><span>Home</span></button>
      <div className="lesson-title"><h1 className="learn-heading">History</h1><span className="learn-count">{total} solved</span></div>
      <span/>
    </header>
    <main className="game history">
      {days >= 2 && <p className="history-streak"><Icon name="sparkles" size={16}/><b>{days} days</b> in a row</p>}
      <section className="history-calendar" aria-labelledby="history-month">
        <div className="history-month">
          <button aria-label="Previous month" onClick={() => { setMonthOffset(offset => offset - 1); setSelected(null); }}><Icon name="chevron" size={16}/></button>
          <h2 id="history-month" aria-live="polite">{monthName}</h2>
          <button aria-label="Next month" aria-disabled={monthOffset === 0} onClick={() => { if (monthOffset === 0) return; setMonthOffset(offset => offset + 1); setSelected(null); }}><Icon name="chevron" size={16}/></button>
        </div>
        <div className="history-week" aria-hidden="true">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, k) => <span key={k}>{d}</span>)}</div>
        <div className="history-days">
          {Array.from({ length: grid.lead }, (_, k) => <span key={`lead${k}`}/>)}
          {grid.days.map(day => {
            const mine = byDay.get(day) ?? [];
            const label = <><span>{dateOf(day).getDate()}</span><i aria-hidden="true">{mine.slice(0, 4).map(s => <em key={s.id} className={`history-dot level-${s.difficulty}`}/>)}{mine.length > 4 && <b className="history-more-dots">+</b>}</i></>;
            const className = `history-day${day === today ? ' today' : ''}${day > today ? ' future' : ''}`;
            return mine.length ? <button key={day} className={className} data-day={day} aria-pressed={selected === day}
              aria-label={`${dateOf(day).toLocaleDateString('en-US', dateOf(day).getFullYear() === now.getFullYear() ? { month: 'long', day: 'numeric' } : { month: 'long', day: 'numeric', year: 'numeric' })}: ${mine.length} ${mine.length === 1 ? 'solve' : 'solves'}: ${LEVELS.map(level => [level, mine.filter(s => s.difficulty === level).length] as const).filter(([, n]) => n).map(([level, n]) => `${n} ${level}`).join(', ')}`}
              onClick={() => { setSelected(current => current === day ? null : day); setShown(PAGE); }}>{label}</button>
              : <span key={day} className={className} data-day={day}>{label}</span>;
          })}
        </div>
      </section>
      <div className="history-levels">{LEVELS.map(level => <div key={level} className={`history-level level-${level}`}>
        <LevelTiles level={level}/>
        <span className="history-level-count"><b>{stats[level].count}</b><small>{capital(level)}</small></span>
        {!hideTimer && <em>{stats[level].best === null ? '–' : `Best ${solveTime(stats[level].best)}`}</em>}
      </div>)}</div>
      <h2 className="history-heading">{selected ? dateOf(selected).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'Recent'}</h2>
      <ol className="history-list" ref={list}>{listed.slice(0, shown).map(solve => <li key={solve.id} className={`history-row level-${solve.difficulty}`} tabIndex={-1}>
        <Pattern givens={solve.givens}/>
        <span className="history-row-copy"><strong>{capital(solve.difficulty)}</strong><small>{when(solve.day)}</small></span>
        {!hideTimer && <span className="history-time">{solveTime(solve.seconds)}</span>}
      </li>)}</ol>
      {listed.length > shown && <button className="text-button history-more" onClick={() => {
        // The button unmounts after the last page, so focus moves to the first new solve.
        const first = shown;
        setShown(first + PAGE);
        requestAnimationFrame(() => (list.current?.children[first] as HTMLElement | undefined)?.focus());
      }}>Show more</button>}
      {!selected && earlier > 0 && <p className="history-earlier">+{earlier} earlier</p>}
    </main>
  </>;
}
