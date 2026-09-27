import type { GameState } from '@/lib/game';
import { percentFilled, type HomeState } from '@/lib/home';
import { LESSON_BANDS, lessonName, type LessonId } from '@/lib/lessons';
import type { Difficulty } from '@/lib/sudoku';
import { AppMark, Icon } from './icons';
import { LessonDiagram } from './learn-page';

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
const LEVEL_NOTES: Record<Difficulty, string> = { easy: 'Ease into it', medium: 'A little more thought', hard: 'Take your time', expert: 'For seasoned solvers' };
const LESSON_COUNT = LESSON_BANDS.reduce((total, { lessons }) => total + lessons.length, 0);
const capital = (text: string) => text[0].toUpperCase() + text.slice(1);
const time = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
const Bars = ({ level }: { level: Difficulty }) => <span className="level-mark" aria-hidden="true">{LEVELS.map((step, k) => <i key={step} className={k <= LEVELS.indexOf(level) ? 'active' : ''}/>)}</span>;

function MiniBoard({ game, size }: { game: GameState; size: number }) {
  return <svg className="home-board" width={size} height={size} viewBox="0 0 9 9" aria-hidden="true">
    <rect width="9" height="9" rx=".4"/>
    {[1, 2, 4, 5, 7, 8].map(k => <g key={k} className="thin"><line x1={k} y1="0" x2={k} y2="9"/><line x1="0" y1={k} x2="9" y2={k}/></g>)}
    {[3, 6].map(k => <g key={k}><line x1={k} y1="0" x2={k} y2="9"/><line x1="0" y1={k} x2="9" y2={k}/></g>)}
    {game.values.map((value, i) => value ? <text key={i} x={i % 9 + .5} y={Math.floor(i / 9) + .56} className={game.givens[i] ? 'given' : 'entered'}>{value}</text> : null)}
  </svg>;
}

export type HomeProps = {
  state: HomeState; game: GameState | null; seconds: number | null; learned: number; next: LessonId | null; solved: number;
  onContinue: () => void; onPlay: (level: Difficulty) => void; onLesson: (id: LessonId) => void; onLearn: () => void; onSettings: () => void;
  notice?: React.ReactNode;
};

export function Home({ state, game, seconds, learned, next, solved, onContinue, onPlay, onLesson, onLearn, onSettings, notice }: HomeProps) {
  const clock = seconds === null ? '' : ` · ${time(seconds)}`;
  return <>
    <header className="app-bar">
      <h1 className="brand"><AppMark small/><span>Sudoku</span></h1>
      <div className="app-actions"><button className="icon-button settings-button" aria-label="Settings" onClick={onSettings}><Icon name="settings"/></button></div>
    </header>
    <main className="game home">
      {notice}
      {state === 'playing' && game && <section className="home-card home-continue" aria-labelledby="home-continue">
        <MiniBoard game={game} size={132}/>
        <div className="home-continue-copy">
          <span className="home-eyebrow">In progress</span>
          <h2 id="home-continue">{capital(game.difficulty)} puzzle</h2>
          <span className="home-meta"><Bars level={game.difficulty}/>{percentFilled(game)}% filled{clock}</span>
          <button className="primary-button home-continue-button" onClick={onContinue}>Continue</button>
        </div>
      </section>}
      {state === 'done' && game && <section className="home-card home-solved" aria-labelledby="home-solved">
        <MiniBoard game={game} size={84}/>
        <div className="home-continue-copy">
          <span className="home-eyebrow solved">Solved</span>
          <h2 id="home-solved">{capital(game.difficulty)} puzzle</h2>
          <span className="home-meta"><Bars level={game.difficulty}/>{clock.replace(' · ', '')}</span>
        </div>
      </section>}
      {state === 'playing' ? <>
        <h2 className="home-heading">New puzzle</h2>
        <div className="home-levels">{LEVELS.map(level => <button key={level} className="home-level" onClick={() => onPlay(level)} aria-label={`New ${level} puzzle`}><Bars level={level}/><span>{capital(level)}</span></button>)}</div>
      </> : <section className="home-card home-start" aria-labelledby="home-start">
        <h2 id="home-start">{state === 'new' ? 'Pick your first puzzle' : 'Play another'}</h2>
        <div className="home-levels big">{LEVELS.map(level => <button key={level} className="home-level" onClick={() => onPlay(level)} aria-label={`New ${level} puzzle: ${LEVEL_NOTES[level]}`}><Bars level={level}/><span>{capital(level)}</span><small>{LEVEL_NOTES[level]}</small></button>)}</div>
      </section>}
      <div className="home-heading-row"><h2 className="home-heading">Learn</h2><button className="text-button home-all" onClick={onLearn}>All techniques</button></div>
      {next ? <button className="home-card home-lesson" onClick={() => onLesson(next)}>
        <LessonDiagram id={next}/>
        <span className="home-lesson-copy"><strong>{learned ? 'Next' : 'Start with'}: {lessonName(next)}</strong><span className="home-meta">{learned} of {LESSON_COUNT} techniques learned</span></span>
        <Icon name="chevron" size={16}/>
      </button> : <button className="home-card home-lesson" onClick={onLearn}>
        <span className="home-lesson-copy"><strong>Every technique learned</strong><span className="home-meta">Revisit any lesson</span></span>
        <Icon name="chevron" size={16}/>
      </button>}
      {solved > 0 && <p className="home-foot">{solved} {solved === 1 ? 'puzzle' : 'puzzles'} solved</p>}
    </main>
  </>;
}
