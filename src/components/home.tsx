import type { GameState } from '@/lib/game';
import { percentFilled, type HomeState } from '@/lib/home';
import { LESSON_BANDS, lessonName, type LessonId } from '@/lib/lessons';
import type { Difficulty } from '@/lib/sudoku';
import { AppMark, Icon } from './icons';
import { LessonDiagram } from './learn-page';

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
const LEVEL_NOTES: Record<Difficulty, string> = { easy: 'Warm up', medium: 'A little thought', hard: 'Take your time', expert: 'Bring your best' };
const LESSON_COUNT = LESSON_BANDS.reduce((total, { lessons }) => total + lessons.length, 0);
const capital = (text: string) => text[0].toUpperCase() + text.slice(1);
const time = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
// Shown on a first visit, before there is a game of the player's own.
const SAMPLE = [...'530070000600195000098000060800060003400803001700020006060000280000419005000080079'].map(Number);

function MiniBoard({ values, givens, size }: { values: readonly number[]; givens: readonly number[]; size: number }) {
  return <svg className="home-board" width={size} height={size} viewBox="0 0 9 9" aria-hidden="true">
    <rect width="9" height="9" rx=".45"/>
    {[1, 2, 4, 5, 7, 8].map(k => <g key={k} className="thin"><line x1={k} y1="0" x2={k} y2="9"/><line x1="0" y1={k} x2="9" y2={k}/></g>)}
    {[3, 6].map(k => <g key={k}><line x1={k} y1="0" x2={k} y2="9"/><line x1="0" y1={k} x2="9" y2={k}/></g>)}
    {values.map((value, i) => value ? <text key={i} x={i % 9 + .5} y={Math.floor(i / 9) + .56} className={givens[i] ? 'given' : 'entered'}>{value}</text> : null)}
  </svg>;
}

/** A 3×3 of tiles, more of them filled the harder the level. */
const LevelTiles = ({ level }: { level: Difficulty }) => <span className="level-tiles" aria-hidden="true">
  {Array.from({ length: 9 }, (_, k) => <i key={k} className={[0, 4, 8, 2, 6, 1, 3, 5, 7].indexOf(k) < 2 + LEVELS.indexOf(level) * 2 ? 'on' : ''}/>)}
</span>;

export type HomeProps = {
  state: HomeState; game: GameState | null; seconds: number | null; learned: number; next: LessonId | null; solved: number; greeting: string;
  onContinue: () => void; onPlay: (level: Difficulty) => void; onLesson: (id: LessonId) => void; onLearn: () => void; onSettings: () => void;
  notice?: React.ReactNode;
};

export function Home({ state, game, seconds, learned, next, solved, greeting, onContinue, onPlay, onLesson, onLearn, onSettings, notice }: HomeProps) {
  const clock = seconds === null ? '' : time(seconds);
  return <>
    <header className="app-bar">
      <h1 className="brand"><AppMark small/><span>Sudoku</span></h1>
      <div className="app-actions"><button className="icon-button settings-button" aria-label="Settings" onClick={onSettings}><Icon name="settings"/></button></div>
    </header>
    <main className="game home">
      {notice}
      <p className="home-hello">{greeting}</p>
      {state === 'playing' && game ? <>
        <h2 className="home-title" id="home-continue">Your {game.difficulty} puzzle<br/>is right where you left it</h2>
        <button className="home-hero home-continue-button" aria-label={`Continue, ${percentFilled(game)}% filled`} onClick={onContinue}>
          <MiniBoard values={game.values} givens={game.givens} size={196}/>
          <span className="home-meta" aria-hidden="true">{[`${percentFilled(game)}% filled`, clock].filter(Boolean).join(' · ')}</span>
          <span className="home-go" aria-hidden="true"><Icon name="play" size={16}/>Continue</span>
        </button>
      </> : state === 'done' && game ? <>
        <h2 className="home-title" id="home-solved">Nicely solved.<br/>Up for another?</h2>
        <div className="home-hero quiet">
          <MiniBoard values={game.values} givens={game.givens} size={150}/>
          <span className="home-meta"><span className="home-eyebrow solved"><Icon name="check" size={14}/>Solved</span>{clock && ` · ${clock}`}</span>
        </div>
      </> : <>
        <h2 className="home-title" id="home-start">Ready for<br/>your first puzzle?</h2>
        <div className="home-hero quiet" aria-hidden="true"><MiniBoard values={SAMPLE} givens={SAMPLE} size={150}/></div>
      </>}
      <div className="home-levels">{LEVELS.map(level => <button key={level} className={`home-level level-${level}`} onClick={() => onPlay(level)} aria-label={`New ${level} puzzle: ${LEVEL_NOTES[level]}`}>
        <LevelTiles level={level}/><strong>{capital(level)}</strong><small>{LEVEL_NOTES[level]}</small>
      </button>)}</div>
      <div className="home-chips">
        {solved > 0 && <span className="home-chip home-solved-count"><Icon name="check" size={15}/>{solved} solved</span>}
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
    </main>
  </>;
}
