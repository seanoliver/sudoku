import type { ReactNode } from 'react';
import { Icon } from './icons';

export function GameBar({ meta, hidden, onHome, homeDisabled, onHint, hintDisabled, onSettings }: { meta: ReactNode; hidden: boolean; onHome: () => void; homeDisabled: boolean; onHint: () => void; hintDisabled: boolean; onSettings: () => void }) {
  return <header className={`game-bar ${hidden ? 'lesson-hidden' : ''}`}>
    <h1 className="sr-only">Sudoku</h1>
    <button className="icon-button home-button" aria-label="Home" title="Home" disabled={homeDisabled} onClick={onHome}><Icon name="home"/></button>
    <div className="game-bar-center">{meta}</div>
    <div className="game-bar-actions">
      <button className="icon-button hint-button" aria-label="Show a hint" title="Hint (H)" disabled={hintDisabled} onClick={onHint}><Icon name="bulb" size={19}/></button>
      <button className="icon-button settings-button" aria-label="Settings" onClick={onSettings}><Icon name="settings"/></button>
    </div>
  </header>;
}
