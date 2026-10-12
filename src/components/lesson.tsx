import { Icon } from './icons';
import { inSentence } from '@/lib/lessons';

export type CoachState = 'watch' | 'practice' | 'correct' | 'wrong';

/** Replaces the app bar during a lesson: the way back, the technique, and practice progress. */
export function LessonBar({ name, done, current, count, back, onExit }: { name: string; done: number; current: number | null; count: number; back: string; onExit: () => void }) {
  return <header className="app-bar lesson-bar">
    <button className="lesson-back" onClick={onExit}><Icon name="chevron" size={16}/><span>{back}</span></button>
    <div className="lesson-title">
      <strong>{name}</strong>
      <span className="lesson-dots" role="img" aria-label={`${done} of ${count} practice boards done`}>{Array.from({ length: count }, (_, k) => <i key={k} className={k < done ? 'done' : k === current ? 'now' : ''}/>)}</span>
    </div>
    <span/>
  </header>;
}

const STATE: Record<CoachState, ['bulb' | 'check' | 'close', (technique: string) => string]> = {
  watch: ['bulb', () => 'Watch how it works'], practice: ['bulb', technique => `Find the ${technique}`], correct: ['check', () => 'Found it'], wrong: ['close', () => 'Not quite'],
};
export type LessonAction = { label: string; disabled?: boolean; onClick: (at: number) => void };
export type LessonWalk = { index: number; count: number; text: string; onStep: (index: number, at: number) => void };

/** Under the board: what the lesson says and its one action. */
export function LessonCoach({ name, state, walk, action }: { name: string; state: CoachState; walk: LessonWalk | null; action: LessonAction | null }) {
  const [icon, text] = STATE[state];
  const button = action && <button className="primary-button lesson-action" disabled={action.disabled} onClick={event => action.onClick(event.timeStamp)}>{action.label}</button>;
  return <div className={`lesson-coach ${state} ${walk ? 'walking' : ''}`}>
    <div className="lesson-coach-state"><Icon name={icon} size={17}/><span role="status">{text(inSentence(name))}</span>{!walk && button}</div>
    {walk && <>
      <div className="walk-progress" aria-hidden="true">{Array.from({ length: walk.count }, (_, k) => <i key={k} className={k <= walk.index ? 'done' : ''}/>)}</div>
      <p className="lesson-coach-text">{walk.text}</p>
      <div className="walk-actions">
        <button className="walk-back" aria-label="Previous step" disabled={walk.index === 0} onClick={event => walk.onStep(walk.index - 1, event.timeStamp)}><Icon name="chevron" size={16}/></button>
        {walk.index >= walk.count - 1 && button ? button : <button className="walk-next" aria-label="Next step" disabled={walk.index >= walk.count - 1} onClick={event => walk.onStep(walk.index + 1, event.timeStamp)}>Next</button>}
      </div>
    </>}
  </div>;
}

/** Fills the controls area once every practice board is done. */
export function LessonDone({ name, back, onExit }: { name: string; back: string; onExit: () => void }) {
  return <div className="lesson-done">
    <span className="success-mark"><Icon name="check" size={25}/></span>
    <div><h2>{name} learned</h2><p>You found it on every practice board.</p></div>
    <button className="primary-button" onClick={onExit}>{back}</button>
  </div>;
}
