'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createGame, enter, undo, restore, isComplete, SAVE_KEY, type GameState } from '@/lib/game';
import { conflicts, peers, type Difficulty, type Puzzle } from '@/lib/sudoku';
import { automaticNotes, candidateCells, getCandidates } from '@/lib/candidates';
import { CellNotes } from './cell-notes';
import { DeductionSettings } from './deduction-settings';
import { AppMark, Icon } from './icons';
import { Clock } from './clock';
import { restorePreferences, DEFAULT_PREFS, PREFS_KEY, type Theme, type Preferences } from '@/lib/preferences';

type Sheet = 'new' | 'settings' | 'help' | 'install' | null;
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
const DIGITS = [1,2,3,4,5,6,7,8,9];
const EMPTY_NOTES: number[] = [];
const LEVELS: Difficulty[] = ['easy','medium','hard'];

export default function SudokuGame() {
  const [game, setGame] = useState<GameState | null>(null);
  const [selected, setSelected] = useState(0);
  const [pencil, setPencil] = useState(false);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [preferences, setPreferences] = useState(DEFAULT_PREFS);
  const [offlineReady, setOfflineReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const worker = useRef<Worker | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const complete = game ? isComplete(game) : false;

  const requestPuzzle = useCallback((level: Difficulty) => {
    setBusy(true); setError('');
    try {
      // Lazy construction keeps the worker available for retry if startup fails.
      if (!worker.current) {
        const nextWorker = new Worker(new URL('../lib/puzzle.worker.ts', import.meta.url));
        nextWorker.onmessage = ({ data }: MessageEvent<{ puzzle?: Puzzle; error?: string }>) => {
          if (data.puzzle) {
            setGame(createGame(data.puzzle));
            setSelected(data.puzzle.givens.indexOf(0));
            setDifficulty(data.puzzle.difficulty);
            setPaused(false); setPencil(false);
          } else setError(data.error ?? 'Could not create a puzzle. Please try again.');
          setBusy(false);
        };
        nextWorker.onerror = () => {
          setError('Could not create a puzzle. Please try again.'); setBusy(false);
          nextWorker.terminate(); worker.current = null;
        };
        worker.current = nextWorker;
      }
      worker.current.postMessage({ difficulty: level });
    } catch { setBusy(false); setError('Could not create a puzzle. Reload the app to try again.'); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        const saved = raw ? restore(raw) : null;
        if (saved) {
          setGame(saved); setSelected(saved.values.indexOf(0) === -1 ? 0 : saved.values.indexOf(0));
          setDifficulty(saved.difficulty); setBusy(false);
        } else {
          requestPuzzle('easy');
          if (raw) setError('Your saved puzzle could not be restored. A new one is ready.');
        }
      } catch { setStorageError(true); requestPuzzle('easy'); }
      try {
        const prefs = restorePreferences(localStorage.getItem(PREFS_KEY));
        setPreferences(prefs); document.documentElement.setAttribute('data-theme', prefs.theme);
      } catch { /* Keep the restored puzzle even when preferences cannot be read. */ }
      setInstalled(window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    }, 0);
    return () => { clearTimeout(timer); worker.current?.terminate(); worker.current = null; };
  }, [requestPuzzle]);

  useEffect(() => {
    if (!game) return;
    let timer: number | undefined;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(game)); }
    catch { timer = window.setTimeout(() => setStorageError(true), 0); }
    return () => clearTimeout(timer);
  }, [game]);

  useEffect(() => {
    const onPrompt = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallEvent); };
    const onInstalled = () => { setInstalled(true); setInstallEvent(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    let active = true;
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready).then(() => { if (active) setOfflineReady(true); }).catch(() => { /* Retry on the next visit; gameplay remains available. */ });
    }
    return () => { active = false; window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const syncChrome = () => {
      const dark = preferences.theme === 'dark' || (preferences.theme === 'system' && media.matches);
      document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.setAttribute('content', dark ? '#181c24' : '#f5f6f8'));
    };
    syncChrome(); media.addEventListener('change', syncChrome);
    return () => media.removeEventListener('change', syncChrome);
  }, [preferences.theme]);

  const updatePreferences = (patch: Partial<Preferences>) => {
    const next = { ...preferences, ...patch };
    setPreferences(next); document.documentElement.setAttribute('data-theme', next.theme);
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { setStorageError(true); }
  };
  const openSheet = (next: Sheet) => { setSheet(next); dialog.current?.showModal(); };
  const closeSheet = () => dialog.current?.close();
  const input = (value: number) => {
    if (paused || busy || sheet || complete) return;
    setGame(current => current ? enter(current, { index: selected, value, pencil }) : current);
  };
  const doUndo = () => { if (!paused && !busy && !complete) setGame(current => current ? undo(current) : current); };
  const handleKey = (event: KeyboardEvent) => {
    if (sheet || paused || busy || !game || (event.target as HTMLElement).closest('dialog')) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); doUndo(); return; }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const movement: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 };
    if (event.key in movement) {
      event.preventDefault();
      const next = (selected + movement[event.key] + 81) % 81;
      setSelected(next); board.current?.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)?.focus();
    } else if (/^[1-9]$/.test(event.key)) { event.preventDefault(); input(Number(event.key)); }
    else if (['Backspace','Delete','0'].includes(event.key)) { event.preventDefault(); input(0); }
    else if (event.key.toLowerCase() === 'n') { event.preventDefault(); setPencil(value => !value); }
  };
  const badCells = useMemo(() => game && preferences.showConflicts ? conflicts(game.values) : new Set<number>(), [game, preferences.showConflicts]);
  const related = useMemo(() => new Set(peers(selected)), [selected]);
  const selectedValue = game?.values[selected] ?? 0;
  const values = game?.values;
  const candidates = useMemo(() => values ? getCandidates({ values, deductions: preferences.deductions }) : null,
    [values, preferences.deductions]);
  const possible = useMemo(() => candidates && preferences.smartHighlighting && !complete
    ? candidateCells(candidates, selectedValue) : new Set<number>(), [candidates, preferences.smartHighlighting, complete, selectedValue]);
  const autoNotes = useMemo(() => preferences.autoNotes && candidates
    ? automaticNotes(candidates) : null, [preferences.autoNotes, candidates]);
  const filled = game ? game.values.filter(Boolean).length - game.givens.filter(Boolean).length : 0;
  const total = game ? game.givens.filter(n => !n).length : 1;
  const editable = game && !game.givens[selected] && !busy && !paused && !complete;

  return <div className="app" onKeyDown={handleKey}>
    <header className="app-bar">
      <div className="brand"><AppMark small/><span>Sudoku</span></div>
      <div className="app-actions">
        {!installed && <button className="install-button" onClick={() => openSheet('install')}><Icon name="download" size={17}/><span>Install app</span></button>}
        <button className="icon-button settings-button" aria-label="Settings" onClick={() => openSheet('settings')}><Icon name="settings"/></button>
      </div>
    </header>

    <main className="game">
      <div className="game-heading"><div><h1>Sudoku</h1><p>Take your time.</p></div><button className="new-button" disabled={busy} onClick={() => { setDifficulty(game?.difficulty ?? 'easy'); openSheet('new'); }}><Icon name="plus" size={18}/><span>New puzzle</span></button></div>
      <div className="game-meta">
        <button className="difficulty-button" disabled={busy} onClick={() => { setDifficulty(game?.difficulty ?? 'easy'); openSheet('new'); }} aria-label={`Difficulty: ${game?.difficulty ?? 'easy'}. Start a new puzzle`}><span className="level-mark"><i/><i className={game?.difficulty !== 'easy' ? 'active' : ''}/><i className={game?.difficulty === 'hard' ? 'active' : ''}/></span><span className="capitalize">{game?.difficulty ?? 'easy'}</span><Icon name="chevron" size={14}/></button>
        <div className="time-controls">{game ? <Clock key={game.id} id={game.id} running={!paused && !sheet && !busy && !complete}/> : <span className="clock">00:00</span>}<button className="pause-button" aria-label={paused ? 'Resume game' : 'Pause game'} disabled={busy || complete || !game} onClick={() => setPaused(value => !value)}><Icon name={paused ? 'play' : 'pause'} size={15}/></button></div>
      </div>

      <div className={`board-wrap ${complete ? 'is-complete' : ''}`}>
        <div className="board" role="grid" aria-label="Sudoku puzzle" aria-rowcount={9} aria-colcount={9} ref={board} aria-busy={busy} inert={paused || busy}>
          {Array.from({ length: 9 }, (_, row) => <div role="row" className="board-row" key={row}>
            {Array.from({ length: 9 }, (_, col) => {
              const i = row * 9 + col;
              const value = game?.values[i] ?? 0;
              const given = Boolean(game?.givens[i]);
              const manualNotes = game?.notes[i] ?? EMPTY_NOTES;
              const notes = autoNotes ? [...new Set([...manualNotes, ...autoNotes[i]])].sort((a, b) => a - b) : manualNotes;
              const selectedCell = selected === i && !complete;
              const same = value > 0 && selectedValue === value;
              const classes = ['cell', given ? 'given' : 'entered', selectedCell ? 'selected' : '', !selectedCell && related.has(i) && preferences.highlightPeers && !complete ? 'related' : '', same && !selectedCell && !complete ? 'matching' : '', possible.has(i) ? 'possible' : '', badCells.has(i) ? 'conflict' : ''].filter(Boolean).join(' ');
              return <div role="gridcell" aria-selected={selectedCell} aria-readonly={given} aria-rowindex={row+1} aria-colindex={col+1} key={i} className="cell-slot"><button className={classes} data-index={i} data-given={given} tabIndex={selected === i ? 0 : -1} aria-label={`Row ${row+1}, column ${col+1}, ${value ? `${value}${given ? ', given' : ''}` : notes.length ? `notes ${notes.join(', ')}` : 'empty'}${possible.has(i) ? `, possible placement for ${selectedValue}` : ''}${badCells.has(i) ? ', conflict' : ''}`} aria-disabled={complete} onClick={() => setSelected(i)}>
                {value ? <span className="cell-number">{value}</span> : null}
                <CellNotes key={game?.id} filled={Boolean(value)} manual={manualNotes} automatic={autoNotes?.[i] ?? EMPTY_NOTES}/>
                {badCells.has(i) && <span className="conflict-dot"/>}
              </button></div>;
            })}
          </div>)}
        </div>
        {(paused || busy || !game) && <div className="board-cover">
          {busy ? <><span className="spinner"/><h2>Getting your puzzle ready</h2></> : paused ? <><span className="pause-emblem"><Icon name="pause" size={28}/></span><h2>Take a break</h2><p>Your puzzle will be right here.</p><button className="primary-button" onClick={() => setPaused(false)}><Icon name="play" size={17}/>Resume puzzle</button></> : <><h2>Let’s try that again</h2><button className="primary-button" onClick={() => requestPuzzle(difficulty)}>Create puzzle</button></>}
        </div>}
      </div>

      <div className="progress-line" role="progressbar" aria-label="Cells filled" aria-valuemin={0} aria-valuemax={total} aria-valuenow={filled}><span style={{ transform: `scaleX(${filled/total})` }}/></div>
      {complete ? <div className="completion" role="status"><span className="success-mark"><Icon name="check" size={25}/></span><div><h2>Nicely done.</h2><p>Every number in its place.</p></div><button className="primary-button" onClick={() => openSheet('new')}>Play again</button></div> : <>
        <div className="tools" aria-label="Puzzle tools">
          <button className="tool-button" disabled={!game?.history.length || paused || busy} onClick={doUndo} title="Undo (⌘Z / Ctrl+Z)"><Icon name="undo"/><span>Undo</span></button>
          <button className="tool-button" disabled={!editable || (!game?.values[selected] && !game?.notes[selected].length)} onClick={() => input(0)} title="Erase (Backspace)"><Icon name="erase"/><span>Erase</span></button>
          <button className={`tool-button ${pencil ? 'tool-active' : ''}`} aria-pressed={pencil} disabled={paused || busy} onClick={() => setPencil(value => !value)} title="Notes (N)"><span className="notes-icon"><Icon name="pencil"/><span className="notes-badge">{pencil ? 'On' : 'Off'}</span></span><span>Notes</span></button>
        </div>
        <div className={`number-pad ${pencil ? 'pencil-mode' : ''}`} aria-label="Number pad">
          {DIGITS.map(n => {
            const remaining = Math.max(0, 9 - (game?.values.filter(v => v === n).length ?? 0));
            return <button key={n} className={`number-key ${!remaining ? 'digit-finished' : ''}`} aria-label={`Enter ${n}${pencil ? ' as a note' : ''}`} disabled={!editable} onClick={() => input(n)}><span>{n}</span><small aria-hidden="true">{remaining || <Icon name="check" size={10}/>}</small></button>;
          })}
        </div>
        <p className="input-hint">{pencil ? 'Notes on. Tap a number to add or remove a note.' : game?.givens[selected] ? 'Choose an empty cell to add a number.' : 'Select a cell, then a number.'}</p>
      </>}

      {error && <div className="notice" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss message"><Icon name="close" size={16}/></button></div>}
      {storageError && <p className="storage-warning" role="status">Saving is unavailable in this browser. Keep this tab open to continue your puzzle.</p>}
      <footer className="game-footer"><span>{offlineReady ? <><span className="status-dot"/>Ready to play offline</> : 'Free to play. No ads.'}</span><button onClick={() => openSheet('help')}><Icon name="help" size={15}/>How to play</button></footer>
    </main>
    <div className="desktop-caption">A simple game. A little space to think.</div>

    <dialog className="sheet" ref={dialog} onClose={() => setSheet(null)} onClick={event => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeSheet(); } }} aria-labelledby="sheet-title">
      <div className="sheet-content"><div className="sheet-handle"/><button className="sheet-close icon-button" onClick={closeSheet} aria-label="Close dialog"><Icon name="close" size={19}/></button>
        {sheet === 'new' && <><div className="sheet-symbol"><Icon name="plus" size={28}/></div><h2 id="sheet-title">A fresh puzzle</h2><p className="sheet-subtitle">Choose how much of a challenge you’d like.</p><div className="difficulty-options" role="group" aria-label="Puzzle difficulty">{LEVELS.map(level => <button key={level} className={difficulty === level ? 'chosen' : ''} aria-pressed={difficulty === level} onClick={() => setDifficulty(level)}><span className="capitalize">{level}</span><small>{{ easy: 'Ease into it', medium: 'A little more thought', hard: 'Take your time' }[level]}</small><span className="radio-mark">{difficulty === level && <Icon name="check" size={12}/>}</span></button>)}</div>{game && !complete && <p className="replacement-note">This will replace your current puzzle.</p>}<button className="primary-button full-width" onClick={() => { closeSheet(); requestPuzzle(difficulty); }}>Start puzzle</button><button className="text-button full-width" onClick={closeSheet}>Keep playing</button></>}
        {sheet === 'settings' && <><h2 id="sheet-title">Make yourself at home</h2><p className="sheet-subtitle">A few little preferences.</p><div className="setting-section"><h3>Appearance</h3><div className="segmented">{(['system','light','dark'] as Theme[]).map(theme => <button key={theme} aria-pressed={preferences.theme === theme} className={preferences.theme === theme ? 'active' : ''} onClick={() => updatePreferences({ theme })}><span className="capitalize">{theme}</span></button>)}</div></div><div className="setting-row"><div><strong>Show conflicts</strong><p>Mark repeated numbers in red</p></div><button className="switch" role="switch" aria-checked={preferences.showConflicts} aria-label="Show conflicts" onClick={() => updatePreferences({ showConflicts: !preferences.showConflicts })}><span/></button></div><div className="setting-row"><div><strong>Highlight related cells</strong><p>Follow the row, column, and box</p></div><button className="switch" role="switch" aria-checked={preferences.highlightPeers} aria-label="Highlight related cells" onClick={() => updatePreferences({ highlightPeers: !preferences.highlightPeers })}><span/></button></div><div className="setting-row"><div><strong>Smart highlighting</strong><p>Select a filled cell to see where its number could go</p></div><button className="switch" role="switch" aria-checked={preferences.smartHighlighting} aria-label="Smart highlighting" onClick={() => updatePreferences({ smartHighlighting: !preferences.smartHighlighting })}><span/></button></div><div className="setting-row"><div><strong>Auto notes</strong><p>Note numbers with only one or two possible cells in a box</p></div><button className="switch" role="switch" aria-checked={preferences.autoNotes} aria-label="Auto notes" onClick={() => updatePreferences({ autoNotes: !preferences.autoNotes })}><span/></button></div><DeductionSettings value={preferences.deductions} onChange={deductions => updatePreferences({ deductions })}/><p className="privacy-note">Your puzzles and preferences stay on this device. No account, no tracking, no ads.</p><button className="primary-button full-width" onClick={closeSheet}>Done</button></>}
        {sheet === 'help' && <><div className="sheet-symbol"><Icon name="help" size={28}/></div><h2 id="sheet-title">Nine numbers. One rule.</h2><p className="sheet-subtitle">Fill every row, column, and 3 × 3 box with the numbers 1–9, using each number just once.</p><div className="help-row"><Icon name="pencil"/><div><h3>Room for a possibility</h3><p>Turn on Notes to pencil in possible numbers. Entering a number clears that note from related cells.</p></div></div><div className="help-row"><Icon name="undo"/><div><h3>Try things out</h3><p>Undo takes back your last change, including notes. The darker starting numbers stay in place.</p></div></div><div className="help-row"><Icon name="help"/><div><h3>Smart highlighting</h3><p>Enable Smart highlighting in Settings, then select a filled cell. Green cells show where its number is allowed by the current row, column, box, and enabled deductions. These are possible placements, not guaranteed answers. Select an empty cell to clear the highlights.</p></div></div><div className="help-row"><Icon name="pencil"/><div><h3>Auto notes</h3><p>Enable Auto notes in Settings to note a number when it has only one or two possible cells in a 3 × 3 box. Possibilities follow placed numbers and any deductions enabled in Settings. Automatic notes update as the board changes and stay visible while the rule applies, even if you remove a manual note. Turn Auto notes off to hide them; your manual notes stay.</p></div></div><div className="keyboard-help"><h3>Using a keyboard?</h3><p><kbd>↑ ↓ ← →</kbd> Move between cells</p><p><kbd>1–9</kbd> Enter a number <kbd>N</kbd> Toggle notes</p><p><kbd>⌫</kbd> Erase <kbd>⌘ / Ctrl Z</kbd> Undo</p></div><button className="primary-button full-width" onClick={closeSheet}>Got it</button></>}
        {sheet === 'install' && <><AppMark/><h2 id="sheet-title">A place on your home screen</h2><p className="sheet-subtitle">Open straight into your puzzle, with more space to play. Once ready, Sudoku works offline too.</p>{installed ? <p className="install-instructions">Sudoku is already installed.</p> : installEvent ? <button className="primary-button full-width" onClick={async () => { try { await installEvent.prompt(); const choice = await installEvent.userChoice; if (choice.outcome === 'accepted') closeSheet(); setInstallEvent(null); } catch { setInstallEvent(null); } }}>Install Sudoku</button> : <div className="install-instructions"><h3>On iPhone or iPad</h3><p>Open in Safari, tap the Share button, then choose <strong>Add to Home Screen</strong>.</p><h3>On Android or desktop</h3><p>Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>, when available.</p></div>}<p className="privacy-note">{offlineReady ? 'Your app is ready for offline play.' : 'Connect to the internet for the first visit. Offline play becomes available after the app finishes downloading.'}</p><button className="text-button full-width" onClick={closeSheet}>Done</button></>}
      </div>
    </dialog>
  </div>;
}
