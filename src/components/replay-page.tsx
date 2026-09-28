'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { boardsOf, stepKinds, type Replay } from '@/lib/replay';
import type { Difficulty } from '@/lib/sudoku';
import { CellNotes } from './cell-notes';
import { LevelTiles } from './home';
import { Icon } from './icons';

const STEP_MS = 180;
const SPEEDS = [1, 2, 4] as const;
const EMPTY: number[] = [];
const time = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

export function ReplayPage({ replay, solution, level, seconds, onExit }: { replay: Replay; solution: readonly number[]; level: Difficulty; seconds: number | null; onExit: () => void }) {
  const boards = useMemo(() => boardsOf(replay), [replay]);
  const kinds = useMemo(() => stepKinds(replay, solution), [replay, solution]);
  const last = boards.length - 1;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const board = boards[index];
  const changed = new Set(index > 0 ? replay.steps[index - 1].map(([cell]) => cell) : []);
  const givens = boards[0].values;

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
      if ((event.target as Element | null)?.closest('button, input')) return;
      if (event.key === ' ') { event.preventDefault(); keys.current.toggle(); }
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
        <div className="replay-ticks" aria-hidden="true">{kinds.map((kind, k) => <i key={k} className={`${kind}${k < index ? ' past' : ''}`}/>)}</div>
        <input type="range" min={0} max={last} value={index} onChange={event => seek(Number(event.target.value))} aria-label="Replay position" aria-valuetext={`Step ${index + 1} of ${boards.length}`}/>
        <div className="replay-row">
          <span className="replay-count">{index + 1} of {boards.length}</span>
          <div className="replay-speeds" role="group" aria-label="Replay speed">{SPEEDS.map(s => <button key={s} aria-pressed={speed === s} onClick={() => setSpeed(s)}>{s}×</button>)}</div>
        </div>
      </div>
    </main>
  </>;
}
