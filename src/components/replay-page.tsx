'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { boardsOf, stepKinds, type Replay } from '@/lib/replay';
import type { Difficulty } from '@/lib/sudoku';
import { CellNotes } from './cell-notes';
import { LevelTiles } from './home';
import { Icon } from './icons';

const STEP_MS = 180;
const TICK = { number: 8, note: 5, fix: 18, other: 5 } as const;
const SPEEDS = [1, 2, 4] as const;
const EMPTY: number[] = [];
const time = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

export function ReplayPage({ replay, givens, solution, level, seconds, onExit }: { replay: Replay; givens: readonly number[]; solution: readonly number[]; level: Difficulty; seconds: number | null; onExit: () => void }) {
  const boards = useMemo(() => boardsOf(replay), [replay]);
  const kinds = useMemo(() => stepKinds(replay, solution), [replay, solution]);
  const last = boards.length - 1;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const board = boards[index];
  // Outline the cell whose number changed; a step that only changes notes outlines the cells it touched.
  const step = index > 0 ? replay.steps[index - 1] : [];
  const numberCells = step.filter(([cell, value]) => value !== boards[index - 1]?.values[cell]).map(([cell]) => cell);
  const changed = new Set(numberCells.length ? numberCells : step.map(([cell]) => cell));

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => { if (index >= last) setPlaying(false); else setIndex(index + 1); }, STEP_MS / speed);
    return () => clearTimeout(timer);
  }, [playing, index, last, speed]);

  const toggle = () => { if (!playing && index >= last) setIndex(0); setPlaying(!playing); };
  const seek = (next: number) => { setPlaying(false); setIndex(Math.max(0, Math.min(last, next))); };
  const keys = useRef({ toggle, seek, index });
  useEffect(() => { keys.current = { toggle, seek, index }; });
  useEffect(() => {
    // On the document so the keys work wherever focus is; buttons and the scrubber keep their own keys.
    const onKey = (event: globalThis.KeyboardEvent) => {
      // Leave the browser's own shortcuts, such as Alt+Left for Back, alone.
      if (event.altKey || event.metaKey || event.ctrlKey || event.repeat) return;
      const target = event.target as Element | null;
      // Buttons take Space themselves, and the scrubber takes the arrow keys but not Space.
      if (event.key === ' ') { if (target?.closest('button')) return; event.preventDefault(); keys.current.toggle(); }
      else if (target?.closest('input')) return;
      else if (event.key === 'ArrowRight') { event.preventDefault(); keys.current.seek(keys.current.index + 1); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); keys.current.seek(keys.current.index - 1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const count = (kind: string) => kinds.filter(k => k === kind).length;
  return <>
    <header className="app-bar lesson-bar">
      <button className="lesson-back" onClick={onExit}><Icon name="chevron" size={16}/><span>Done</span></button>
      <span/><span/>
    </header>
    <main className="game replay">
      <div className="replay-headline">
        <p className="home-hello">Replay</p>
        <h1 className="home-title">Your {level} solve</h1>
        <span className={`home-meta level-${level}`}><LevelTiles level={level}/>{seconds !== null && time(seconds)}</span>
      </div>
      <div className="replay-hero">
        <div className="board-wrap">
          <div className="board replay-board" role="img" aria-label={`Board at step ${index + 1} of ${boards.length}`}>
            {Array.from({ length: 9 }, (_, row) => <div className="board-row" key={row}>
              {Array.from({ length: 9 }, (_, col) => {
                const i = row * 9 + col;
                const value = board.values[i];
                const given = givens[i] !== 0;
                const wrong = value !== 0 && !given && value !== solution[i];
                return <div key={i} className="cell-slot"><div className={['cell', given ? 'given' : 'entered', wrong ? 'wrong' : '', changed.has(i) ? 'changed' : ''].filter(Boolean).join(' ')}>
                  {value ? <span className="cell-number">{value}</span> : null}
                  {wrong && <span className="conflict-dot"/>}
                  <CellNotes filled={value !== 0} manual={board.notes[i]} automatic={EMPTY} excluded={board.exclusions[i]} boardKey="replay"/>
                </div></div>;
              })}
            </div>)}
          </div>
        </div>
        <button className="home-go replay-play" onClick={toggle}><Icon name={playing ? 'pause' : 'play'} size={16}/>{playing ? 'Pause' : 'Play'}</button>
      </div>
      <div className="replay-stats">
        <span className="replay-stat replay-numbers"><b>{count('number')}</b>numbers</span>
        <span className="replay-stat replay-notes"><b>{count('note')}</b>notes</span>
        <span className="replay-stat replay-fixes"><b>{count('fix')}</b>fixed</span>
      </div>
      <div className="replay-timeline">
        {/* One unit per step, stretched to the card's width, so any number of steps fits. */}
        <svg className="replay-ticks" viewBox={`0 0 ${kinds.length} ${TICK.fix}`} preserveAspectRatio="none" aria-hidden="true">
          {kinds.map((kind, k) => <rect key={k} x={k} y={TICK.fix - TICK[kind]} width={kinds.length > 120 ? 1 : .8} height={TICK[kind]} className={`${kind}${k < index ? ' past' : ''}`}/>)}
        </svg>
        <input type="range" min={0} max={last} value={index} onChange={event => seek(Number(event.target.value))} aria-label="Replay position" aria-valuetext={`Step ${index + 1} of ${boards.length}`}/>
        <div className="replay-row">
          <span className="replay-count">{index + 1} of {boards.length}</span>
          <div className="replay-speeds" role="group" aria-label="Replay speed">{SPEEDS.map(s => <button key={s} aria-pressed={speed === s} onClick={() => setSpeed(s)}>{s}×</button>)}</div>
        </div>
      </div>
    </main>
  </>;
}
