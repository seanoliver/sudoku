'use client';
import { useEffect, useState, ViewTransition } from 'react';
import { untilNext, weekOf } from '@/lib/daily';
import type { GameState } from '@/lib/game';
import { percentFilled } from '@/lib/home';
import { LESSON_BANDS, lessonName, type LessonId } from '@/lib/lessons';
import type { Difficulty } from '@/lib/sudoku';
import { AppMark, Icon } from './icons';
import { LessonDiagram } from './learn-page';
import { BOARD_SHARE } from './screen-motion';

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
export const LEVEL_NOTES: Record<Difficulty, string> = { easy: 'Warm up', medium: 'A little thought', hard: 'Take your time', expert: 'Bring your best' };
const LESSON_COUNT = LESSON_BANDS.reduce((total, { lessons }) => total + lessons.length, 0);
const capital = (text: string) => text[0].toUpperCase() + text.slice(1);
const time = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
const dateOf = (day: string) => { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d); };
const EMPTY: readonly number[] = Array(81).fill(0);

function MiniBoard({ values, givens, size, done = false }: { values: readonly number[]; givens: readonly number[]; size: number; done?: boolean }) {
  return <svg className={`home-board${done ? ' daily-board-done' : ''}`} width={size} height={size} viewBox="0 0 9 9" aria-hidden="true">
    <rect width="9" height="9" rx=".45"/>
    {[1, 2, 4, 5, 7, 8].map(k => <g key={k} className="thin"><line x1={k} y1="0" x2={k} y2="9"/><line x1="0" y1={k} x2="9" y2={k}/></g>)}
    {[3, 6].map(k => <g key={k}><line x1={k} y1="0" x2={k} y2="9"/><line x1="0" y1={k} x2="9" y2={k}/></g>)}
    {values.map((value, i) => value ? <text key={i} x={i % 9 + .5} y={Math.floor(i / 9) + .56} className={givens[i] ? 'given' : 'entered'}>{value}</text> : null)}
  </svg>;
}
/** A board too small for digits: a square for each filled cell. */
const DotBoard = ({ values, givens, size }: { values: readonly number[]; givens: readonly number[]; size: number }) => <svg className="home-board" width={size} height={size} viewBox="0 0 9 9" aria-hidden="true">
  <rect width="9" height="9" rx=".45"/>
  {[3, 6].map(k => <g key={k}><line x1={k} y1="0" x2={k} y2="9"/><line x1="0" y1={k} x2="9" y2={k}/></g>)}
  {values.map((value, i) => value ? <rect key={i} x={i % 9 + .15} y={Math.floor(i / 9) + .15} width=".7" height=".7" rx=".15" className={givens[i] ? 'mini-given' : 'mini-entered'}/> : null)}
</svg>;

/** A 3×3 of tiles, more of them filled the harder the level. */
export const LevelTiles = ({ level }: { level: Difficulty }) => <span className="level-tiles" aria-hidden="true">
  {Array.from({ length: 9 }, (_, k) => <i key={k} className={[0, 4, 8, 2, 6, 1, 3, 5, 7].indexOf(k) < 2 + LEVELS.indexOf(level) * 2 ? 'on' : ''}/>)}
</span>;

/** `done` is the chosen level's daily solved today; `solvedDays` counts a day solved at any level. */
export type DailyView = { today: string; level: Difficulty; game: GameState | null; seconds: number | null; started: boolean; done: boolean; solvedDays: ReadonlySet<string>; streak: number };
export type HomeProps = {
  daily: DailyView | null; resume: { game: GameState; seconds: number | null } | null; learned: number; next: LessonId | null; solved: number; greeting: string;
  /** Which board opens into the game, so only it shares the board's transition. */
  shared: 'daily' | 'regular' | null;
  onDaily: () => void; onDailyLevel: () => void; onMonth: () => void; onContinue: () => void; onPlay: (level: Difficulty) => void; onLesson: (id: LessonId) => void; onLearn: () => void; onSettings: () => void;
  onHistory: () => void;
  /** Omitted once the app is installed. */
  onInstall?: () => void;
  notice?: React.ReactNode;
};

const Shared = ({ on, children }: { on: boolean; children: React.ReactElement }) => on ? <ViewTransition name="board" share={BOARD_SHARE} default="none">{children}</ViewTransition> : children;

/** Today's puzzle: the date, the streak, the board, the week, the level, and Play, Continue, or the time to the next one. */
function DailyHero({ daily, shared, onPlay, onLevel, onMonth }: { daily: DailyView; shared: boolean; onPlay: () => void; onLevel: () => void; onMonth: () => void }) {
  const { today, level, game, seconds, started, done, solvedDays, streak } = daily;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!done) return;
    const timer = window.setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(timer);
  }, [done]);
  const week = weekOf(today);
  const weekSolved = week.filter(day => solvedDays.has(day)).length;
  return <>
    <h2 className="home-title">Today’s puzzle<br/>is {done ? 'solved' : started ? 'waiting' : 'ready'}</h2>
    <section className={`daily-hero${done ? ' done' : ''}`} aria-label="Today’s puzzle">
      <div className="daily-hero-top">
        <span className="daily-date">{dateOf(today).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        {streak > 0 && <span className="daily-streak"><Icon name="sparkles" size={14}/><b>{streak}</b>{streak === 1 ? ' day' : ' days'}<span className="sr-only"> in a row</span></span>}
      </div>
      <div className="daily-hero-board">
        <Shared on={shared}><MiniBoard values={game ? done ? game.solution : game.values : EMPTY} givens={game?.givens ?? EMPTY} size={150} done={done}/></Shared>
        {done && <span className="daily-check"><Icon name="check" size={26}/></span>}
      </div>
      <button className="daily-week-link" aria-label={`This month. ${weekSolved} of the last 7 days solved`} onClick={onMonth}>
        <ol className="daily-week" aria-hidden="true">{week.map(day => <li key={day} className={`${solvedDays.has(day) ? 'solved' : ''}${day === today ? ' today' : ''}`}><small>{'SMTWTFS'[dateOf(day).getDay()]}</small><i>{solvedDays.has(day) && <Icon name="check" size={12}/>}</i></li>)}</ol>
        <Icon name="chevron" size={15}/>
      </button>
      <div className="daily-hero-foot">
        <button className={`daily-level level-${level}`} aria-label={`Daily level: ${level}. Change`} onClick={onLevel}><LevelTiles level={level}/><span>{capital(level)}</span><Icon name="chevron" size={13}/></button>
        {done ? <span className="daily-next"><Icon name="clock" size={15}/>Next in {untilNext(now)}</span>
          : <button className="daily-play" aria-label={started ? `Continue today’s puzzle${seconds === null ? '' : `, ${time(seconds)}`}` : 'Play today’s puzzle'} onClick={onPlay}><Icon name="play" size={15}/>{started ? `Continue${seconds === null ? '' : ` · ${time(seconds)}`}` : 'Play'}</button>}
      </div>
    </section>
  </>;
}

export function Home({ daily, resume, learned, next, solved, greeting, shared, onDaily, onDailyLevel, onMonth, onContinue, onPlay, onLesson, onLearn, onSettings, onHistory, onInstall, notice }: HomeProps) {
  const meta = resume && [`${percentFilled(resume.game)}%`, resume.seconds === null ? '' : time(resume.seconds)].filter(Boolean).join(' · ');
  return <>
    <header className="app-bar">
      <h1 className="brand"><AppMark small/><span>Sudoclue</span></h1>
      <div className="app-actions"><button className="icon-button settings-button" aria-label="Settings" onClick={onSettings}><Icon name="settings"/></button></div>
    </header>
    <main className="game home">
      {notice}
      <p className="home-hello">{greeting}</p>
      {daily && <DailyHero daily={daily} shared={shared === 'daily'} onPlay={onDaily} onLevel={onDailyLevel} onMonth={onMonth}/>}
      {resume && <button className="resume-row" aria-label={`Continue your ${resume.game.difficulty} puzzle, ${percentFilled(resume.game)}% filled`} onClick={onContinue}>
        <Shared on={shared === 'regular'}><DotBoard values={resume.game.values} givens={resume.game.givens} size={44}/></Shared>
        <span className="home-lesson-copy"><small>Your puzzle</small><strong>{capital(resume.game.difficulty)}</strong></span>
        <span className="resume-meta" aria-hidden="true">{meta}</span>
        <Icon name="chevron" size={16}/>
      </button>}
      <div className="home-levels">{LEVELS.map(level => <button key={level} className={`home-level level-${level}`} onClick={() => onPlay(level)} aria-label={`New ${level} puzzle: ${LEVEL_NOTES[level]}`}>
        <LevelTiles level={level}/><strong>{capital(level)}</strong><small>{LEVEL_NOTES[level]}</small>
      </button>)}</div>
      <div className="home-chips">
        {solved > 0 && <button className="home-chip home-solved-count" aria-label={`History, ${solved} solved`} onClick={onHistory}><Icon name="check" size={15}/>{solved} solved</button>}
        <button className="home-chip home-all" aria-label="All techniques" onClick={onLearn}><Icon name="learn" size={15}/>{learned ? `${learned} of ${LESSON_COUNT} techniques` : `${LESSON_COUNT} techniques`}</button>
      </div>
      {next ? <button className="home-lesson" onClick={() => onLesson(next)}>
        <LessonDiagram id={next}/>
        <span className="home-lesson-copy"><small>{learned ? 'Learn next' : 'New to Sudoku? Start here'}</small><strong>{lessonName(next)}</strong></span>
        <Icon name="chevron" size={16}/>
      </button> : <button className="home-lesson" onClick={onLearn}>
        <span className="home-lesson-copy"><small>Every technique learned</small><strong>Revisit any lesson</strong></span>
        <Icon name="chevron" size={16}/>
      </button>}
      {onInstall && <button className="home-install" onClick={onInstall}>
        <AppMark small/>
        <span className="home-lesson-copy"><strong>Add Sudoclue to Home Screen</strong><small>Opens in one tap and works offline</small></span>
        <Icon name="chevron" size={16}/>
      </button>}
    </main>
  </>;
}
