'use client';
import { useState } from 'react';
import { dailyStreak, type DailySolve } from '@/lib/daily';
import { Icon } from './icons';
import { dateOf, MonthCalendar } from './month-calendar';
import { ScreenHeader } from './screen-header';

/** The daily's month: a check on each day with a daily solved. */
export function DailyPage({ solved, today, onExit }: { solved: DailySolve[]; today: string; onExit: () => void }) {
  const [offset, setOffset] = useState(0);
  const days = new Set(solved.map(solve => solve.day));
  const streak = dailyStreak(solved, today);
  return <>
    <ScreenHeader title="Daily" subtitle={`${days.size} solved`} back="Home" size="large" onExit={onExit}/>
    <main className="game history daily-page">
      {streak >= 2 && <p className="history-streak"><Icon name="sparkles" size={16}/><b>{streak} days</b> in a row</p>}
      <MonthCalendar today={today} offset={offset} onOffset={setOffset} day={day => {
        const done = days.has(day);
        return <span key={day} className={`daily-day${done ? ' solved' : ''}${day === today ? ' today' : ''}${day > today ? ' future' : ''}${day < today && !done ? ' missed' : ''}`} data-day={day}>
          {done ? <><Icon name="check" size={13}/><span className="sr-only">{dateOf(day).getDate()}, solved</span></> : dateOf(day).getDate()}
        </span>;
      }}/>
    </main>
  </>;
}
