import { LESSON_BANDS, lessonDiagram, lessonName, type Learned, type LessonId } from '@/lib/lessons';
import { Icon } from './icons';

const BAND_NAMES = { easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert' } as const;
const COUNT = LESSON_BANDS.reduce((total, { lessons }) => total + lessons.length, 0);

/** A small board showing the lesson's example move: the pattern, the move, and any coloring. */
function Diagram({ id }: { id: LessonId }) {
  return <svg className="learn-diagram" viewBox="0 0 9 9" aria-hidden="true">
    {lessonDiagram(id).map((role, i) => <rect key={i} className={`learn-cell ${role}`} x={i % 9 + .06} y={Math.floor(i / 9) + .06} width=".88" height=".88" rx=".12"/>)}
    {[3, 6].map(k => <g key={k}><line x1={k} y1="0" x2={k} y2="9"/><line x1="0" y1={k} x2="9" y2={k}/></g>)}
  </svg>;
}

/** Every lesson, easiest first, with what the player has learned. */
export function LearnPage({ learned, onOpen, onExit }: { learned: Learned; onOpen: (id: LessonId) => void; onExit: () => void }) {
  const done = LESSON_BANDS.flatMap(({ lessons }) => lessons).filter(id => learned[id]).length;
  return <>
    <header className="app-bar lesson-bar">
      <button className="lesson-back" onClick={onExit}><Icon name="chevron" size={16}/><span>Your game</span></button>
      <div className="lesson-title"><strong>Learn</strong><span className="learn-count">{done} of {COUNT} learned</span></div>
      <span/>
    </header>
    <main className="game learn-list">
      {LESSON_BANDS.map(({ band, lessons }) => <section key={band} className="learn-band" aria-labelledby={`learn-${band}`}>
        <h2 id={`learn-${band}`}>{BAND_NAMES[band]}</h2>
        {lessons.map(id => <button key={id} className="learn-row" data-lesson={id} onClick={() => onOpen(id)} aria-label={`${lessonName(id)}${learned[id] ? ', learned' : ''}`}>
          <Diagram id={id}/>
          <span className="learn-name">{lessonName(id)}</span>
          {learned[id] ? <span className="learn-check"><Icon name="check" size={14}/></span> : <span className="learn-check empty"/>}
          <Icon name="chevron" size={16}/>
        </button>)}
      </section>)}
    </main>
  </>;
}
