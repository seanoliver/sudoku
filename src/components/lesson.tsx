import { Icon } from './icons';
import { inSentence } from '@/lib/lessons';

export type LessonPromptState = 'watch' | 'practice' | 'correct' | 'wrong';

/** Replaces the app bar during a lesson: the way back, the technique, and practice progress. */
export function LessonBar({ name, done, current, count, onExit }: { name: string; done: number; current: number | null; count: number; onExit: () => void }) {
  return <header className="app-bar lesson-bar">
    <button className="lesson-back" onClick={onExit}><Icon name="chevron" size={16}/><span>Your game</span></button>
    <div className="lesson-title">
      <strong>{name}</strong>
      <span className="lesson-dots" role="img" aria-label={`${done} of ${count} practice boards done`}>{Array.from({ length: count }, (_, k) => <i key={k} className={k < done ? 'done' : k === current ? 'now' : ''}/>)}</span>
    </div>
    <span/>
  </header>;
}

/** Sits where the hint strip does, so the board stays in the same place as in a game. */
export function LessonPrompt({ name, state }: { name: string; state: LessonPromptState }) {
  const lower = inSentence(name);
  const [icon, text] = { watch: ['bulb', name], practice: ['bulb', `Find the ${lower}`], correct: ['check', `That’s the ${lower}`], wrong: ['close', 'Not quite'] }[state] as ['bulb' | 'check' | 'close', string];
  return <div className={`lesson-prompt ${state}`} role="status"><Icon name={icon} size={18}/><span>{text}</span></div>;
}

export function LessonFooter({ label, disabled = false, onClick }: { label: string; disabled?: boolean; onClick: (at: number) => void }) {
  return <button className="primary-button full-width lesson-footer" disabled={disabled} onClick={event => onClick(event.timeStamp)}>{label}</button>;
}

/** Fills the controls area once every practice board is done. */
export function LessonDone({ name, onExit }: { name: string; onExit: () => void }) {
  return <div className="lesson-done">
    <span className="success-mark"><Icon name="check" size={25}/></span>
    <div><h2>{name} learned</h2><p>You found it on every practice board.</p></div>
    <button className="primary-button" onClick={onExit}>Back to your game</button>
  </div>;
}
