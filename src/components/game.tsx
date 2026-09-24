'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createGame, restartGame, enter, addNotes, addExclusions, fillNotes, undo, redo, restore, isComplete, rejectEntry, SAVE_KEY, type GameState, type Rejection } from '@/lib/game';
import { peers, getEntryDigits, completedUnits, celebrationLabel, type Difficulty, type Puzzle } from '@/lib/sudoku';
import { candidateCells, excludedCells, getPlayableCandidates } from '@/lib/candidates';
import { useNoteSelection } from './use-note-selection';
import { activeMode, beginBatch, selectMode, toggleMode, INITIAL_ENTRY_MODE, type EntryMode, type EntryModeState } from '@/lib/entry-mode';
import { CellNotes } from './cell-notes';
import { AppMark, Icon } from './icons';
import { Clock } from './clock';
import { restorePreferences, DEFAULT_PREFS, PREFS_KEY, type Theme, type Preferences } from '@/lib/preferences';

type Sheet = 'restart' | 'new' | 'settings' | 'help' | 'install' | null;
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
const DIGITS = [1,2,3,4,5,6,7,8,9];
const EMPTY_NOTES: number[] = [];
const FOCUS_HINT_KEY = 'sudoku.focus-hold-learned.v1';
const LEVELS: Difficulty[] = ['easy','medium','hard'];
const REJECTION_MS = 800;
const CELEBRATION_STEP_MS = 45;
const CELEBRATION_MS = 520;
/** Manhattan distance between two cells on the 9x9 grid. */
const distance = (a: number, b: number) => Math.abs(Math.floor(a / 9) - Math.floor(b / 9)) + Math.abs(a % 9 - b % 9);

export default function SudokuGame() {
  const [game, setGame] = useState<GameState | null>(null);
  const [selected, setSelected] = useState(0);
  const [focusedDigit, setFocusedDigit] = useState<number | null>(null);
  const [focusHoldLearned, setFocusHoldLearned] = useState(false);
  const [entry, setEntry] = useState<EntryModeState>(INITIAL_ENTRY_MODE);
  const [clockResetRevision, setClockResetRevision] = useState(0);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [blockedEntry, setBlockedEntry] = useState<(Rejection & { index: number; value: number; id: number }) | null>(null);
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
  const rejectionId = useRef(0);
  const [celebration, setCelebration] = useState<{ id: number; origin: number; cells: number[]; label: string } | null>(null);
  const celebrationId = useRef(0);
  const complete = game ? isComplete(game) : false;
  const selectCell = (index: number) => {
    setSelected(index); setBlockedEntry(null);
    if (focusedDigit !== null && game?.values[index]) setFocusedDigit(game.values[index]);
  };
  const selection = useNoteSelection({
    values: game?.values, enabled: Boolean(game) && !paused && !busy && !sheet && !complete,
    onSelect: selectCell, onBegin: () => { setEntry(beginBatch); setBlockedEntry(null); },
    onFocus: ({ index, hasSelection }) => {
      const digit = game?.values[index];
      if (!digit) return;
      if (!hasSelection) selectCell(index);
      setFocusedDigit(digit); setFocusHoldLearned(true);
      try { localStorage.setItem(FOCUS_HINT_KEY, 'true'); } catch { /* The shortcut works without storage. */ }
    },
  });
  const batchSelection = selection.indices.length > 0;
  const mode = activeMode(entry, { batch: batchSelection });
  const notesActive = mode !== 'value';
  const pencil = mode === 'note';
  const excluding = mode === 'exclude';
  const resetSelection = selection.reset;
  const entryDigits = useMemo(() => game ? getEntryDigits({ values: game.values, index: selected }) : [], [game, selected]);
  const numberFocus = !notesActive && (!game || selected < 0 || Boolean(game.values[selected]));
  const filtering = preferences.filterNumberKeys && !pencil && !excluding && !numberFocus;

  const requestPuzzle = useCallback((level: Difficulty) => {
    resetSelection(); setFocusedDigit(null);
    setBusy(true); setError(''); setBlockedEntry(null); setCelebration(null);
    try {
      // Lazy construction keeps the worker available for retry if startup fails.
      if (!worker.current) {
        const nextWorker = new Worker(new URL('../lib/puzzle.worker.ts', import.meta.url));
        nextWorker.onmessage = ({ data }: MessageEvent<{ puzzle?: Puzzle; error?: string }>) => {
          if (data.puzzle) {
            setGame(createGame(data.puzzle));
            setSelected(data.puzzle.givens.indexOf(0));
            setDifficulty(data.puzzle.difficulty);
            setPaused(false); setEntry(INITIAL_ENTRY_MODE);
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
  }, [resetSelection]);

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
      try { setFocusHoldLearned(localStorage.getItem(FOCUS_HINT_KEY) === 'true'); } catch { /* Keep the hint when storage is unavailable. */ }
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

  useEffect(() => {
    if (!blockedEntry) return;
    const timer = window.setTimeout(() => setBlockedEntry(null), REJECTION_MS);
    return () => window.clearTimeout(timer);
  }, [blockedEntry]);
  const rejection = blockedEntry && !paused && !sheet && !complete ? blockedEntry : null;
  useEffect(() => {
    if (!celebration) return;
    const reach = Math.max(...celebration.cells.map(i => distance(i, celebration.origin)));
    const timer = window.setTimeout(() => setCelebration(null), reach * CELEBRATION_STEP_MS + CELEBRATION_MS);
    return () => window.clearTimeout(timer);
  }, [celebration]);
  const celebrating = celebration && !paused && !sheet ? celebration : null;
  const celebratedCells = useMemo(() => new Set(celebrating?.cells), [celebrating]);

  const updatePreferences = (patch: Partial<Preferences>) => {
    const next = { ...preferences, ...patch };
    setPreferences(next); document.documentElement.setAttribute('data-theme', next.theme);
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { setStorageError(true); }
  };
  const openSheet = (next: Sheet) => { resetSelection(); setBlockedEntry(null); setCelebration(null); setSheet(next); dialog.current?.showModal(); };
  const closeSheet = () => dialog.current?.close();
  const focusSelectedCell = () => board.current?.querySelector<HTMLButtonElement>(`[data-index="${selected}"]`)?.focus();
  const restartPuzzle = () => {
    if (!game || busy) return;
    setGame(restartGame(game)); resetSelection(); setFocusedDigit(null);
    setSelected(game.givens.indexOf(0)); setEntry(INITIAL_ENTRY_MODE);
    setBlockedEntry(null); setCelebration(null); setPaused(false); setClockResetRevision(value => value + 1);
    closeSheet();
  };
  const chooseMode = (next: EntryMode) => {
    setBlockedEntry(null);
    if (batchSelection && next === 'value') resetSelection();
    setEntry(state => selectMode(state, { mode: next, batch: batchSelection }));
    focusSelectedCell();
  };
  /** Keyboard N and X: switch to the mode, or back to Numbers when it is already active. */
  const toggleEntryMode = (target: EntryMode) => {
    setBlockedEntry(null);
    if (batchSelection && mode === target) resetSelection();
    setEntry(state => toggleMode(state, { mode: target, batch: batchSelection }));
  };
  const clearSelection = () => {
    resetSelection();
    focusSelectedCell();
  };
  const input = (value: number) => {
    if (!game || paused || busy || sheet || complete) return;
    if (value !== 0 && numberFocus) { setFocusedDigit(value); setBlockedEntry(null); return; }
    const refused = rejectEntry(game, { index: selected, value, pencil, exclude: excluding, blockIncorrectAnswers: preferences.blockIncorrectAnswers, filterNumberKeys: filtering });
    if (refused) { setBlockedEntry({ ...refused, index: selected, value, id: ++rejectionId.current }); return; }
    setBlockedEntry(null);
    if (batchSelection) {
      if (!value) { clearSelection(); return; }
      const applyBatch = excluding ? addExclusions : addNotes;
      setGame(current => current ? applyBatch(current, { indices: selection.indices, value }) : current);
      clearSelection();
    } else {
      const next = enter(game, { index: selected, value, pencil, exclude: excluding, blockIncorrectAnswers: preferences.blockIncorrectAnswers, filterNumberKeys: preferences.filterNumberKeys });
      if (next === game) return;
      setGame(next);
      if (!pencil && !excluding && value) {
        const units = completedUnits({ before: game.values, after: next.values, index: selected });
        const finished = isComplete(next);
        if (finished || units.length) {
          const label = finished ? 'Puzzle complete' : celebrationLabel(units);
          const cells = finished ? [...Array(81).keys()] : [...new Set(units.flatMap(unit => unit.cells))];
          setCelebration({ id: ++celebrationId.current, origin: selected, cells, label });
        }
      }
    }
  };
  const doUndo = () => { if (!paused && !busy) { resetSelection(); setBlockedEntry(null); setCelebration(null); setGame(current => current ? undo(current) : current); } };
  const doRedo = () => { if (!paused && !busy) { resetSelection(); setBlockedEntry(null); setCelebration(null); setGame(current => current ? redo(current) : current); } };
  const handleKey = (event: KeyboardEvent) => {
    if (sheet || paused || busy || !game || (event.target as HTMLElement).closest('dialog')) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) doRedo(); else doUndo(); focusSelectedCell(); return; }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const movement: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 };
    if (event.key === 'Escape') { event.preventDefault(); clearSelection(); return; }
    if (event.key in movement) {
      event.preventDefault();
      const next = (selected + movement[event.key] + 81) % 81;
      resetSelection(); selectCell(next); board.current?.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)?.focus();
    } else if (/^[1-9]$/.test(event.key)) { event.preventDefault(); input(Number(event.key)); focusSelectedCell(); }
    else if (['Backspace','Delete','0'].includes(event.key)) { event.preventDefault(); input(0); focusSelectedCell(); }
    else if (event.key.toLowerCase() === 'x') { event.preventDefault(); toggleEntryMode('exclude'); }
    else if (event.key.toLowerCase() === 'n') { event.preventDefault(); toggleEntryMode('note'); }
  };
  const badCells = useMemo(() => game && preferences.blockIncorrectAnswers ? new Set(game.values.flatMap((value, i) => value && value !== game.solution[i] ? [i] : [])) : new Set<number>(), [game, preferences.blockIncorrectAnswers]);
  const related = useMemo(() => new Set(peers(selected)), [selected]);
  const selectedCellValue = game?.values[selected] ?? 0;
  const selectedValue = focusedDigit ?? selectedCellValue;
  const values = game?.values;
  const boardKey = values?.join('') ?? '';
  const exclusions = game?.exclusions;
  const candidates = useMemo(() => values && exclusions ? getPlayableCandidates({ values, exclusions }) : null,
    [values, exclusions]);
  const possible = useMemo(() => candidates && preferences.smartHighlighting && !complete
    ? candidateCells(candidates, selectedValue) : new Set<number>(), [candidates, preferences.smartHighlighting, complete, selectedValue]);
  const excludedPossible = useMemo(() => values && exclusions && preferences.smartHighlighting && !complete
    ? excludedCells({ values, exclusions, digit: selectedValue }) : new Set<number>(), [values, exclusions, preferences.smartHighlighting, complete, selectedValue]);
  const filled = game ? game.values.filter(Boolean).length - game.givens.filter(Boolean).length : 0;
  const total = game ? game.givens.filter(n => !n).length : 1;
  const editable = game && !game.givens[selected] && !busy && !paused && !complete;
  const canErase = Boolean(!batchSelection && editable && (game.values[selected] || game.notes[selected].length || game.exclusions[selected].length));

  return <div className="app" onKeyDown={handleKey}>
    <header className="app-bar">
      <h1 className="brand"><AppMark small/><span>Sudoku</span></h1>
      <div className="app-actions">
        {!installed && <button className="install-button" onClick={() => openSheet('install')}><Icon name="download" size={17}/><span>Install app</span></button>}
        <button className="icon-button settings-button" aria-label="Settings" onClick={() => openSheet('settings')}><Icon name="settings"/></button>
      </div>
    </header>

    <main className="game">
      <div className="game-meta">
        <button className="difficulty-button" disabled={busy} onClick={() => { setDifficulty(game?.difficulty ?? 'easy'); openSheet('new'); }} aria-label={`Difficulty: ${game?.difficulty ?? 'easy'}. Start a new puzzle`}><span className="level-mark"><i/><i className={game?.difficulty !== 'easy' ? 'active' : ''}/><i className={game?.difficulty === 'hard' ? 'active' : ''}/></span><span className="capitalize">{game?.difficulty ?? 'easy'}</span><Icon name="chevron" size={14}/></button>
        <div className="time-controls">{game ? <Clock key={game.id} id={game.id} resetRevision={clockResetRevision} hidden={preferences.hideTimer} running={!paused && !sheet && !busy && !complete}/> : <span className="clock">00:00</span>}<button className="pause-button" aria-label={paused ? 'Resume game' : 'Pause game'} disabled={busy || complete || !game} onClick={() => { resetSelection(); setBlockedEntry(null); setCelebration(null); setPaused(value => !value); }}><Icon name={paused ? 'play' : 'pause'} size={15}/></button></div>
      </div>

      <div className="puzzle-panel">
      <div className="digit-focus-bar" role="group" aria-label="Digit focus" inert={paused || busy || complete || !game}>
        {focusedDigit !== null ? <>
          <span className="digit-focus-label" role="status"><span className="focus-indicator" aria-hidden="true"/><span>Focus <strong>{focusedDigit}</strong></span></span>
          <button className="clear-focus-button" aria-label="Clear focus" title="Clear focus" onClick={() => { setFocusedDigit(null); focusSelectedCell(); }}><Icon name="close" size={16}/></button>
        </> : <button className="focus-button" disabled={!selectedCellValue || batchSelection} onClick={() => setFocusedDigit(selectedCellValue)} aria-label={selectedCellValue ? `Focus on ${selectedCellValue}` : 'Focus on a number'} aria-describedby={selectedCellValue && !focusHoldLearned ? 'focus-hold-hint' : undefined}>
          <Icon name="focus" size={18}/><span className="focus-copy"><span>{selectedCellValue ? <>Focus on <strong>{selectedCellValue}</strong></> : 'Select a number to focus'}</span><span id="focus-hold-hint" className="focus-hint" hidden={!selectedCellValue || focusHoldLearned}>Or hold a filled cell</span></span>
        </button>}
      </div>

      <div className={`board-wrap ${complete ? 'is-complete' : ''}`}>
        <div className="board" role="grid" aria-label="Sudoku puzzle" aria-rowcount={9} aria-colcount={9} ref={board} {...selection.pointerHandlers} aria-multiselectable={batchSelection} aria-busy={busy} inert={paused || busy}>
          {Array.from({ length: 9 }, (_, row) => <div role="row" className="board-row" key={row}>
            {Array.from({ length: 9 }, (_, col) => {
              const i = row * 9 + col;
              const value = game?.values[i] ?? 0;
              const given = Boolean(game?.givens[i]);
              const notes = game?.notes[i] ?? EMPTY_NOTES;
              const ruledOut = game?.exclusions[i] ?? EMPTY_NOTES;
              const generated = game?.noteOrigins[i] === 'generated';
              const selectedCell = (batchSelection ? selection.indices.includes(i) : selected === i) && !complete;
              const same = value > 0 && selectedValue === value;
              const classes = ['cell', given ? 'given' : 'entered', selectedCell ? 'selected' : '', !selectedCell && related.has(i) && preferences.highlightPeers && !complete ? 'related' : '', same && !selectedCell && !complete ? 'matching' : '', possible.has(i) ? 'possible' : '', excludedPossible.has(i) ? 'excluded-possible' : '', badCells.has(i) ? 'conflict' : '', rejection?.index === i ? 'rejecting' : ''].filter(Boolean).join(' ');
              return <div role="gridcell" aria-selected={selectedCell} aria-readonly={given} aria-rowindex={row+1} aria-colindex={col+1} key={i} className="cell-slot"><button className={classes} data-index={i} data-given={given} tabIndex={selected === i ? 0 : -1} aria-label={`Row ${row+1}, column ${col+1}, ${value ? `${value}${given ? ', given' : ''}` : notes.length ? `${generated ? 'generated notes' : 'notes'} ${notes.join(', ')}` : 'empty'}${!value && ruledOut.length ? `, ruled out ${ruledOut.join(', ')}` : ''}${possible.has(i) ? `, possible placement for ${selectedValue}` : ''}${excludedPossible.has(i) ? `, excluded placement for ${selectedValue}` : ''}${badCells.has(i) ? ', incorrect answer' : ''}`} aria-disabled={complete} onClick={event => selection.clickCell(event, i)}>
                {celebrating && celebratedCells.has(i) && <span key={`celebrate-${celebrating.id}`} className="unit-celebration" style={{ animationDelay: `${distance(i, celebrating.origin) * CELEBRATION_STEP_MS}ms` }} aria-hidden="true"/>}
                {value ? <span className="cell-number">{value}</span> : null}
                <CellNotes key={game?.id} focusedDigit={complete ? null : focusedDigit} filled={Boolean(value)} manual={generated ? EMPTY_NOTES : notes} automatic={generated ? notes : EMPTY_NOTES} excluded={ruledOut} boardKey={boardKey}/>
                {rejection?.index === i && <span key={`rejected-${rejection.id}`} className="rejected-digit" aria-hidden="true">{rejection.value}</span>}
                {rejection?.sources.includes(i) && <span key={`source-${rejection.id}`} className="rejection-source" aria-hidden="true"/>}
                {badCells.has(i) && <span className="conflict-dot"/>}
              </button></div>;
            })}
          </div>)}
        </div>
        {(paused || busy || !game) && <div className="board-cover">
          {busy ? <><span className="spinner"/><h2>Getting your puzzle ready</h2></> : paused ? <><span className="pause-emblem"><Icon name="pause" size={28}/></span><h2>Take a break</h2><p>Your puzzle will be right here.</p><button className="primary-button" onClick={() => setPaused(false)}><Icon name="play" size={17}/>Resume puzzle</button></> : <><h2>Let’s try that again</h2><button className="primary-button" onClick={() => requestPuzzle(difficulty)}>Create puzzle</button></>}
        </div>}
      </div>
      <p className="sr-only" role="status">{celebrating?.label ?? ''}</p>

      </div>

      <div className="progress-line" role="progressbar" aria-label="Cells filled" aria-valuemin={0} aria-valuemax={total} aria-valuenow={filled}><span style={{ transform: `scaleX(${filled/total})` }}/></div>
      {complete ? <div className="completion" role="status"><span className="success-mark"><Icon name="check" size={25}/></span><div><h2>Nicely done.</h2><p>Every number in its place.</p></div><button className="primary-button" onClick={() => openSheet('new')}>Play again</button></div> : <>
        <div className={batchSelection ? 'batch-keypad' : undefined} role={batchSelection ? 'group' : undefined} aria-label={batchSelection ? 'Selected cells' : undefined}>
          {batchSelection && <div className="batch-heading"><span role="status">{selection.indices.length} {selection.indices.length === 1 ? 'cell' : 'cells'} selected</span><button className="batch-clear" onClick={clearSelection}>Clear selection</button></div>}
          <div className="note-controls" aria-label="Puzzle tools">
            <div className="mode-switch" role="group" aria-label="Entry mode">
              <span className={`mode-indicator mode-indicator-${mode}`} aria-hidden="true"/>
              {(['value', 'note', 'exclude'] as const).map(option => <button key={option} className={`mode-option mode-${option}`} aria-pressed={mode === option} disabled={paused || busy} onClick={() => chooseMode(option)} title={{ value: 'Numbers', note: 'Notes (N)', exclude: 'Exclude (X)' }[option]}>
                <Icon name={({ value: 'numbers', note: 'pencil', exclude: 'exclude' } as const)[option]} size={16}/><span>{{ value: 'Numbers', note: 'Notes', exclude: 'Exclude' }[option]}</span>
              </button>)}
            </div>
            <button className="erase-control" disabled={!canErase} onClick={() => { input(0); focusSelectedCell(); }} aria-label="Erase" title="Erase (Backspace)"><Icon name="erase" size={20}/></button>
          </div>
        <div className={`number-pad mode-${mode}`} aria-label="Number pad">
          {DIGITS.map(n => {
            const remaining = Math.max(0, 9 - (game?.values.filter(v => v === n).length ?? 0));
            const filtered = Boolean(editable && filtering && !entryDigits.includes(n));
            return <button key={n} className={`number-key ${!remaining ? 'digit-finished' : ''} ${filtered ? 'digit-filtered' : ''}`} aria-label={(batchSelection ? `${excluding ? 'Exclude' : 'Add note'} ${n} ${excluding ? 'from' : 'to'} ${selection.indices.length} selected cells` : numberFocus ? `Focus on ${n}` : `${excluding ? 'Rule out' : 'Enter'} ${n}${pencil ? ' as a note' : ''}${filtered ? ', unavailable: already in this row, column, or box' : ''}`) + (remaining ? '' : ', all placed')} disabled={(!editable && !(numberFocus && game && !busy && !paused && !complete)) || filtered} onClick={() => input(n)}><span>{n}</span></button>;
          })}
        </div>
        <p className="input-hint" role="status">{batchSelection ? excluding ? 'Tap a number to exclude from all selected cells.' : 'Tap a number to add a note to all selected cells.' : numberFocus ? 'Tap a number to focus it. Select an empty cell to enter a value.' : filtering ? entryDigits.length ? 'Dimmed numbers already appear in this row, column, or box.' : 'No numbers available here. Check nearby entries or undo.' : 'Select a cell, then a number. Drag across empty cells to select.'}</p>
        <p className="sr-only" role="status">{rejection ? `${rejection.value} rejected, ${rejection.kind === 'constraint' ? `already in this ${rejection.unit}` : 'incorrect for this cell'}${rejection.id % 2 ? '\u00a0' : ''}` : ''}</p>
        </div>
      </>}

      {error && <div className="notice" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss message"><Icon name="close" size={16}/></button></div>}
      {storageError && <p className="storage-warning" role="status">Saving is unavailable in this browser. Keep this tab open to continue your puzzle.</p>}
      <footer className="game-footer"><span>{offlineReady ? <><span className="status-dot"/>Ready to play offline</> : 'Free to play. No ads.'}</span><button onClick={() => openSheet('help')}><Icon name="help" size={15}/>How to play</button></footer>
    </main>
    <div className="desktop-caption">A simple game. A little space to think.</div>

    <dialog className="sheet" ref={dialog} onClose={() => setSheet(null)} onClick={event => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeSheet(); } }} aria-labelledby="sheet-title">
      <div className="sheet-content"><div className="sheet-handle"/><button className="sheet-close icon-button" onClick={closeSheet} aria-label="Close dialog"><Icon name="close" size={19}/></button>
        {sheet === 'new' && <><div className="sheet-symbol"><Icon name="plus" size={28}/></div><h2 id="sheet-title">A fresh puzzle</h2><p className="sheet-subtitle">Choose how much of a challenge you’d like.</p><div className="difficulty-options" role="group" aria-label="Puzzle difficulty">{LEVELS.map(level => <button key={level} className={difficulty === level ? 'chosen' : ''} aria-pressed={difficulty === level} onClick={() => setDifficulty(level)}><span className="capitalize">{level}</span><small>{{ easy: 'Ease into it', medium: 'A little more thought', hard: 'Take your time' }[level]}</small><span className="radio-mark">{difficulty === level && <Icon name="check" size={12}/>}</span></button>)}</div>{game && !complete && <p className="replacement-note">This will replace your current puzzle.</p>}<button className="primary-button full-width" onClick={() => { closeSheet(); requestPuzzle(difficulty); }}>Start puzzle</button><button className="text-button full-width" onClick={closeSheet}>Keep playing</button></>}
        {sheet === 'restart' && <><div className="sheet-symbol"><Icon name="restart" size={28}/></div><h2 id="sheet-title">Restart this puzzle?</h2><p className="sheet-subtitle">Start the same puzzle again with a fresh timer. Your entries, notes, exclusions, and undo history will be cleared.</p><p className="replacement-note">This cannot be undone.</p><button className="primary-button full-width" onClick={restartPuzzle}>Restart puzzle</button><button className="text-button full-width" onClick={closeSheet}>Keep playing</button></>}
        {sheet === 'settings' && <><h2 id="sheet-title">Settings</h2>
          <div className="puzzle-actions">
            <button className="puzzle-action new-puzzle-action" disabled={busy} onClick={() => { setDifficulty(game?.difficulty ?? 'easy'); openSheet('new'); }}><Icon name="plus" size={23}/><span>New puzzle</span></button>
            <button className="puzzle-action" disabled={!game || busy} onClick={() => openSheet('restart')}><Icon name="restart" size={23}/><span>Restart puzzle</span></button>
            <button className="puzzle-action secondary-puzzle-action" disabled={!game?.history.length || paused || busy} onClick={() => { doUndo(); closeSheet(); }} title="Undo (⌘Z / Ctrl+Z)"><Icon name="undo" size={20}/><span>Undo</span></button>
            <button className="puzzle-action secondary-puzzle-action" disabled={!game?.redoHistory.length || paused || busy} onClick={() => { doRedo(); closeSheet(); }} title="Redo (⌘⇧Z / Ctrl+Shift+Z)"><Icon name="undo" size={20} style={{ transform: 'scaleX(-1)' }}/><span>Redo</span></button>
            <button className="puzzle-action secondary-puzzle-action" disabled={!game || paused || busy || complete} onClick={() => { setGame(current => current ? fillNotes(current) : current); closeSheet(); }}><Icon name="fill" size={20}/><span>Fill notes</span></button>
          </div>
          <p className="puzzle-actions-hint">Choose a new puzzle or start this one over.</p><div className="setting-section"><h3>Appearance</h3><div className="segmented">{(['system','light','dark'] as Theme[]).map(theme => <button key={theme} aria-pressed={preferences.theme === theme} className={preferences.theme === theme ? 'active' : ''} onClick={() => updatePreferences({ theme })}><span className="capitalize">{theme}</span></button>)}</div></div><div className="setting-row"><Icon name="shield" size={21}/><div className="setting-copy"><strong>Block incorrect answers</strong><p>Only accept answers that match the solution</p></div><button className="switch" role="switch" aria-checked={preferences.blockIncorrectAnswers} aria-label="Block incorrect answers" onClick={() => updatePreferences({ blockIncorrectAnswers: !preferences.blockIncorrectAnswers })}><span/></button></div><div className="setting-row"><Icon name="fill" size={21}/><div className="setting-copy"><strong>Highlight related cells</strong><p>Follow the row, column, and box</p></div><button className="switch" role="switch" aria-checked={preferences.highlightPeers} aria-label="Highlight related cells" onClick={() => updatePreferences({ highlightPeers: !preferences.highlightPeers })}><span/></button></div><div className="setting-row"><Icon name="sparkles" size={21}/><div className="setting-copy"><strong>Smart highlighting</strong><p>Select a filled cell to see where its number could go</p></div><button className="switch" role="switch" aria-checked={preferences.smartHighlighting} aria-label="Smart highlighting" onClick={() => updatePreferences({ smartHighlighting: !preferences.smartHighlighting })}><span/></button></div><div className="setting-row"><Icon name="filter" size={21}/><div className="setting-copy"><strong>Filter number keys</strong><p id="filter-setting-description">Disable numbers already in this row, column, or box.</p></div><button className="switch" role="switch" aria-checked={preferences.filterNumberKeys} aria-label="Filter number keys" aria-describedby="filter-setting-description" onClick={() => { setBlockedEntry(null); updatePreferences({ filterNumberKeys: !preferences.filterNumberKeys }); }}><span/></button></div><div className="setting-row"><Icon name="clock" size={21}/><div className="setting-copy"><strong>Hide timer</strong><p id="hide-timer-description">Keep tracking time without showing it.</p></div><button className="switch" role="switch" aria-checked={preferences.hideTimer} aria-label="Hide timer" aria-describedby="hide-timer-description" onClick={() => updatePreferences({ hideTimer: !preferences.hideTimer })}><span/></button></div><p className="privacy-note">Your puzzles and preferences stay on this device.</p></>}
        {sheet === 'help' && <><div className="sheet-symbol"><Icon name="help" size={28}/></div><h2 id="sheet-title">Nine numbers. One rule.</h2><p className="sheet-subtitle">Fill every row, column, and 3 × 3 box with the numbers 1–9, using each number just once.</p><div className="help-row"><Icon name="pencil"/><div><h3>Room for a possibility</h3><p>Drag from an empty cell to select cells immediately, or hold an empty cell to begin. Drag across other empty cells, or tap them to add or remove them from your selection. A selection uses Notes, or Exclude when Exclude is chosen. Tap a number to apply it to every selected cell. Afterward you stay in Notes or Exclude, or return to Numbers if you started there. Choosing Numbers cancels the selection. Exclude keeps already-excluded digits excluded. Tap a filled cell to finish selecting, or use Clear selection or Escape. These actions leave your notes unchanged. For repeated note entry in one cell, choose Notes. Entering a number clears that note from related cells.</p></div></div><div className="help-row"><Icon name="undo"/><div><h3>Try things out</h3><p>Undo in Settings takes back your last change, including notes. Redo restores an undone change. Both survive reopening; a new edit clears Redo. Erase appears when the selected cell contains your number or annotations and clears that cell. The darker starting numbers stay in place.</p></div></div><div className="help-row"><Icon name="help"/><div><h3>Smart highlighting</h3><p>Enable Smart highlighting in Settings, then select a filled cell. Green cells show where its number is allowed by the current row, column, and box, excluding digits you have ruled out. Cells where you ruled it out turn faded red. These are possible placements, not guaranteed answers. Select an empty cell to clear the highlights when no digit is focused.</p></div></div><div className="help-row"><Icon name="help"/><div><h3>Keep a number in focus</h3><p>With a filled cell selected, tap a number in the number row to focus that digit. With an empty cell selected, the number row enters a value. You can also choose Focus on its number or hold a filled cell. Matching numbers and notes stay highlighted while you select empty cells or add notes. With Smart highlighting enabled, possible cells stay green too. Select another filled number to switch. Clear focus stops focusing; Clear selection only clears your batch. Focus resets for a new puzzle or when you reopen the app.</p></div></div><div className="help-row"><Icon name="pencil"/><div><h3>Fill notes when you want</h3><p>Fill notes in Settings replaces notes in every empty cell with all possibilities allowed by placed numbers. Your crossed-out exclusions stay in place and are left out of the generated notes. Generated notes are blue; notes you edit use the normal text color. Undo restores the previous notes. Entering a number clears matching notes and exclusions from related cells. Notes do not otherwise update automatically.</p></div></div><div className="help-row"><Icon name="pencil"/><div><h3>Record what you rule out</h3><p>Choose Exclude and tap a number to cross it out in a cell. Tap again to clear it. Exclusions also remove that cell from Smart highlighting for that number. They never trigger deductions in other cells.</p></div></div><div className="help-row"><Icon name="filter"/><div><h3>Filter number keys</h3><p>Enable Filter number keys in Settings to dim and disable numbers already in the selected cell’s row, column, or box. Keyboard entry follows the same rule. Notes and exclusions stay unrestricted. Available numbers are possibilities; Block incorrect answers checks them against the solution separately.</p></div></div><div className="keyboard-help"><h3>Using a keyboard?</h3><p><kbd>↑ ↓ ← →</kbd> Move between cells</p><p><kbd>1–9</kbd> Enter a number <kbd>N</kbd> Notes</p><p><kbd>X</kbd> Exclude. Press the same key again for Numbers.</p><p><kbd>⌫</kbd> Erase <kbd>⌘ / Ctrl Z</kbd> Undo</p><p><kbd>⌘ / Ctrl Shift Z</kbd> Redo</p></div><button className="primary-button full-width" onClick={closeSheet}>Got it</button></>}
        {sheet === 'install' && <><AppMark/><h2 id="sheet-title">A place on your home screen</h2><p className="sheet-subtitle">Open straight into your puzzle, with more space to play. Once ready, Sudoku works offline too.</p>{installed ? <p className="install-instructions">Sudoku is already installed.</p> : installEvent ? <button className="primary-button full-width" onClick={async () => { try { await installEvent.prompt(); const choice = await installEvent.userChoice; if (choice.outcome === 'accepted') closeSheet(); setInstallEvent(null); } catch { setInstallEvent(null); } }}>Install Sudoku</button> : <div className="install-instructions"><h3>On iPhone or iPad</h3><p>Open in Safari, tap the Share button, then choose <strong>Add to Home Screen</strong>.</p><h3>On Android or desktop</h3><p>Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>, when available.</p></div>}<p className="privacy-note">{offlineReady ? 'Your app is ready for offline play.' : 'Connect to the internet for the first visit. Offline play becomes available after the app finishes downloading.'}</p><button className="text-button full-width" onClick={closeSheet}>Done</button></>}
      </div>
    </dialog>
  </div>;
}
