'use client';

import { addTransitionType, startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, ViewTransition, type KeyboardEvent, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { createGame, restartGame, enter, fillLoneNotes, toggleBold, toggleNotes, toggleExclusions, incorrectExclusions, batchHasMark, fillNotes, paintCells, clearColors, undo, redo, restore, isComplete, rejectEntry, SAVE_KEY, type CellColor, type GameState, type Rejection } from '@/lib/game';
import { peers, getEntryDigits, completedUnits, celebrationLabel, type Difficulty, type Puzzle } from '@/lib/sudoku';
import { candidateCells, excludedCells, getPlayableCandidates } from '@/lib/candidates';
import { useNoteSelection } from './use-note-selection';
import { useSheetDrag } from './use-sheet-drag';
import { haptic as playHaptic, type Haptic } from '@/lib/haptics';
import { setStatusBarText } from '@/lib/status-bar';
import { PrivacyPolicy } from './privacy-policy';
import { installNativeBack } from '@/lib/native-back';
import { activeMode, beginBatch, selectMode, toggleMode, INITIAL_ENTRY_MODE, type EntryMode, type EntryModeState } from '@/lib/entry-mode';
import { CellNotes } from './cell-notes';
import * as m from 'motion/react-m';
import { Pressable } from './pressable';
import { SPRINGS } from '@/lib/motion';
import { selectionEdges } from '@/lib/selection-edges';
import { announce, describeAction, type Recovery } from '@/lib/undo-description';
import { AppMark, Icon, type IconName } from './icons';
import { Clock } from './clock';
import { clockKey, dailyGameKey, dailyId, dailyOf, dailySeed, dailyStreak, firstDailyLevel, readDailyGame, readDailyLevel, readDailySolves, recordDailySolve, serializeDailyLevel, serializeDailySolves, storesDaily, DAILY_KEY, DAILY_SOLVES_KEY, type DailySolve } from '@/lib/daily';
import { restorePreferences, DEFAULT_PREFS, PREFS_KEY, type Theme, type Preferences } from '@/lib/preferences';
import { dayKey, isNewBest, levelStats, readSolves, recordSolve, serializeSolves, SOLVES_KEY, type Solve } from '@/lib/solves';
import { replayStats, type Replay } from '@/lib/replay';
import { ACCOMPLISHMENTS_KEY, earnAtSolve, earnedBy, EVIDENCE_KEY, isClean, isFirstAtLevel, noteEvidence, readAccomplishments, readEvidence, serializeAccomplishments, serializeEvidence, type Earned, type Evidence } from '@/lib/accomplishments';
import { fillOrder } from '@/lib/solve-map';
import { canvasBlob, drawShareImage, earnedText, paletteOf } from './share-image';
import { shareFile } from './share-file';
import { HISTORY_KEY, readHistory, recordCompleted, recordSeen, type PuzzleHistory } from '@/lib/history';
import { applyHint, nextHint, type Hint } from '@/lib/hints';
import { hintView, type HintLevel } from '@/lib/hint-view';
import { explainStep, type ExplainLine } from '@/lib/explain';
import { WalkthroughLinks, WalkthroughPanel } from './hint-walkthrough';
import { grade, hasLesson, LEARNED_KEY, LESSON_BANDS, lessonName, lessonOf, markLearned, practiceGame, readLearned, sameBoard, type Grade, type Learned, type LessonId } from '@/lib/lessons';
import { HistoryPage } from './history-page';
import { DailyPage } from './daily-page';
import { ReplayPage } from './replay-page';
import { replayStore } from './replay-store';
import { LearnPage } from './learn-page';
import { Home, LEVEL_NOTES } from './home';
import { homeState, nextLesson, readSolved, solvedCount, savedSeconds, SOLVED_KEY, storeSolved } from '@/lib/home';
import { LESSON_BANK } from '@/lib/lesson-bank';
import { findStep } from '@/lib/steps';
import { THEME_COLOR } from '@/lib/theme-color';
import { LessonBar, LessonCoach, LessonDone } from './lesson';
import { GameBar } from './game-bar';
import { BOARD_SHARE, SCREEN_ENTER, SCREEN_EXIT, type Move } from './screen-motion';

type Screen = 'home' | 'game' | 'learn' | 'history' | 'daily' | 'replay';
type Sheet = 'restart' | 'new' | 'settings' | 'help' | 'privacy' | 'install' | 'colors' | null;
// The game gets its own history entry above Home, so the browser's back button returns Home.
const GAME_ENTRY = 'sudokuGame';
// A replay gets its own entry above whatever opened it, so Back closes it.
const REPLAY_ENTRY = 'sudokuReplay';
// Mark entries with this token, never `true`: entries left from before a reload must not read as live.
const PAGE_LOAD = Math.random().toString(36).slice(2);
const inGameEntry = () => window.history.state?.[GAME_ENTRY] === PAGE_LOAD;
const inReplayEntry = () => window.history.state?.[REPLAY_ENTRY] === PAGE_LOAD;
const staleEntry = () => { const state = window.history.state; return Boolean(state && ((state[GAME_ENTRY] && state[GAME_ENTRY] !== PAGE_LOAD) || (state[REPLAY_ENTRY] && state[REPLAY_ENTRY] !== PAGE_LOAD))); };
const enterGameEntry = () => { if (!inGameEntry()) window.history.pushState({ [GAME_ENTRY]: PAGE_LOAD }, ''); };
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
const DIGITS = [1,2,3,4,5,6,7,8,9];
const COLOR_NAMES = { 1: 'gold', 2: 'blue' } as const;
const EMPTY_NOTES: number[] = [];
const HINT_STRIP_FOCUS = '.hint-strip .hint-action, .hint-strip .clear-focus-button';
const WALK_NEXT_FOCUS = '.walk-next';
const LESSON_ACTION_FOCUS = '.lesson-action';
/** The player's game and its view, set aside untouched while they're on the Learn page or in a lesson. */
type Held = { game: GameState | null; selected: number; focus: number | null; entry: EntryModeState; colorMode: boolean; paused: boolean };
/** A lesson in progress. `from` is where leaving it returns to. */
type LessonState = { id: LessonId; from: 'hint' | 'list' | 'home'; phase: 'watch' | 'practice' | 'done'; board: number; start: GameState; result: Grade | null; line: number };
const marks = (list: ExplainLine['chips'], cell: number) => list?.filter(mark => mark.cell === cell).map(mark => mark.digit).join(' ') || undefined;
const walkUses = (line: ExplainLine, cell: number) => Boolean(line.house?.includes(cell) || line.focus?.includes(cell) || line.target?.includes(cell) || line.colored?.has(cell) || line.ghost?.cell === cell || marks(line.chips, cell) || marks(line.strike, cell));
const walkClasses = (line: ExplainLine, cell: number) => [walkUses(line, cell) ? 'walk-used' : '', line.focus?.includes(cell) ? 'walk-focus' : '', line.target?.includes(cell) ? 'walk-target' : '', line.colored?.has(cell) ? `walk-${line.colored.get(cell) ? 'blue' : 'gold'}` : '', line.ghost?.cell === cell ? 'walk-answer' : ''];
/** Reads, updates and saves play history; storage failures only lose history, never the game. */
const updateHistory = (change: (history: PuzzleHistory) => PuzzleHistory) => { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(change(readHistory(localStorage.getItem(HISTORY_KEY))))); } catch { /* History is optional. */ } };
const seenPuzzles = () => { try { return readHistory(localStorage.getItem(HISTORY_KEY)).seen; } catch { return []; } };
const LEVELS: Difficulty[] = ['easy','medium','hard','expert'];
/** Home's daily: today's games and solves, and the time on the chosen level's daily. */
type DailyHome = { today: string; level: Difficulty; games: Partial<Record<Difficulty, GameState>>; solved: DailySolve[]; seconds: number | null };
/** What a puzzle request is for: a regular game, today's daily, or a daily built for Home to show. */
type Tag = { daily?: string; home?: string };
const readStored = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const storedRegular = () => { const raw = readStored(SAVE_KEY); return raw ? restore(raw) : null; };
function readDailyHome(regular: GameState | null): DailyHome {
  const today = dayKey(new Date());
  const level = readDailyLevel(readStored(DAILY_KEY)) ?? firstDailyLevel({ game: regular?.difficulty, newest: readSolves(readStored(SOLVES_KEY))[0]?.difficulty });
  const games: DailyHome['games'] = {};
  for (const each of LEVELS) {
    const raw = readStored(dailyGameKey(each)), game = readDailyGame(raw, { today, level: each });
    if (game) games[each] = game;
    // An earlier day's daily can no longer be played.
    else if (raw) try { localStorage.removeItem(dailyGameKey(each)); } catch { /* It is ignored when read. */ }
  }
  const id = dailyId(today, level);
  return { today, level, games, solved: readDailySolves(readStored(DAILY_SOLVES_KEY)), seconds: savedSeconds(readStored(clockKey(id)), id) };
}
/** Bars filled up to the level, matching the header's difficulty mark. */
const LevelBars = ({ level }: { level: Difficulty }) => <span className="level-mark" aria-hidden="true">{LEVELS.map((step, k) => <i key={step} className={k <= LEVELS.indexOf(level) ? 'active' : ''}/>)}</span>;
type Finish = { id: string; seconds: number | null; best: number | null; recorded: boolean; earned: Earned | null };
type Counts = { notes: number; fixes: number };
const clockText = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const spokenTime = (seconds: number) => `${plural(Math.floor(seconds / 60), 'minute')} ${plural(seconds % 60, 'second')}`;
const EARNED_ICON: Record<Earned['kind'], IconName> = { streak: 'flame', first: 'flag', clean: 'gem' };
const spokenEarned = (earned: Earned, level: Difficulty) => earned.kind === 'streak' ? `${earned.days}-day streak` : earned.kind === 'first' ? `First ${level} solve` : 'Clean solve';
const finishSummary = (level: Difficulty, seconds: number | null, newBest: boolean, earned: Earned | null) =>
  `Solved${seconds === null ? '' : ` in ${spokenTime(seconds)}`}, ${level}.${newBest ? ' New best time.' : ''}${earned ? ` ${spokenEarned(earned, level)}.` : ''}`;
const Chip = ({ icon, text, spoken, tone }: { icon: IconName; text: string; spoken: string; tone?: 'best' | 'earned' }) =>
  <span className={`finish-chip ${tone ?? ''}`}><Icon name={icon} size={14}/><span aria-hidden="true">{text}</span><span className="sr-only">{spoken}</span></span>;
type ShareSource = { givens: readonly number[]; solution: readonly number[]; replay?: Replay; day: string | null; theme: Theme };
// Drawn before the tap: Safari opens the share sheet only during the tap, and drawing inside it uses the tap up.
function useShareImage(card: RefObject<HTMLDivElement | null>, { level, seconds, earned, source }: { level: Difficulty; seconds: number | null; earned: Earned | null; source: ShareSource }) {
  const [file, setFile] = useState<File | null>(null);
  const { givens, solution, replay, day, theme } = source;
  useEffect(() => {
    let live = true;
    (async () => {
      await document.fonts?.ready;
      if (!live || !card.current) return;
      const canvas = document.createElement('canvas');
      drawShareImage(canvas, { level, order: fillOrder({ givens, solution, replay }), seconds, day, earned, palette: paletteOf(card.current) });
      const blob = await canvasBlob(canvas);
      if (live && blob) setFile(new File([blob], `sudoclue-${day ?? 'solve'}-${level}.png`, { type: 'image/png' }));
    })().catch(() => { /* Sharing is optional; the button stays disabled. */ });
    return () => { live = false; };
  }, [card, level, seconds, earned, givens, solution, replay, day, theme]);
  return file;
}
function FinishCard({ level, seconds, best, newBest, earned, counts, share, onReplay, onPlayAgain }: { level: Difficulty; seconds: number | null; best: number | null; newBest: boolean; earned: Earned | null; counts: Counts | null; share: ShareSource; onReplay?: () => void; onPlayAgain: () => void }) {
  const card = useRef<HTMLDivElement>(null);
  const file = useShareImage(card, { level, seconds, earned, source: share });
  return <div ref={card} className={`completion level-${level}`}>
    <span className="sr-only finish-summary">{finishSummary(level, seconds, newBest, earned)}</span>
    <div className="finish-head" aria-hidden="true">
      <span className="finish-check"><Icon name="check" size={22}/></span>
      {seconds !== null && <span className="finish-time">{clockText(seconds)}</span>}
      <span className="finish-level"><LevelBars level={level}/><span className="capitalize">{level}</span></span>
    </div>
    {(earned || counts || (seconds !== null && best !== null)) && <div className="finish-chips">
      {earned && <Chip icon={EARNED_ICON[earned.kind]} text={earnedText(earned)} spoken={spokenEarned(earned, level)} tone="earned"/>}
      {seconds !== null && best !== null && (newBest
        ? <Chip icon="sparkles" text="Best time" spoken="New best time" tone="best"/>
        : <Chip icon="clock" text={`Best ${clockText(best)}`} spoken={`Best time: ${spokenTime(best)}`}/>)}
      {counts && <>
        <Chip icon="pencil" text={String(counts.notes)} spoken={plural(counts.notes, 'note')}/>
        <Chip icon="undo" text={String(counts.fixes)} spoken={plural(counts.fixes, 'fix', 'fixes')}/>
      </>}
    </div>}
    <div className="finish-actions">
      {onReplay && <button className="secondary-button replay-button" onClick={onReplay}><Icon name="play" size={15}/>Replay</button>}
      <button className="primary-button" onClick={onPlayAgain}>Play again</button>
      <button className="secondary-button share-button" aria-label="Share" disabled={!file} onClick={() => { if (file) shareFile(file).catch(() => { /* A failed share leaves the card as it was. */ }); }}><Icon name="share" size={20}/></button>
    </div>
  </div>;
}
const REJECTION_MS = 800;
const CELEBRATION_STEP_MS = 45;
/** The .lone-fill-ring delay plus duration in globals.css; change them together. */
const LONE_FILL_MS = 1450;
const BOLD_HOLD_MS = 450;
type KeyHold = { key: number; pointerId: number; timer: number; fired: boolean; releasedAt?: number };
const CELEBRATION_MS = 520;
/** Manhattan distance between two cells on the 9x9 grid. */
function SwipeCopy({ screen }: { screen: HTMLElement }) {
  const host = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const copy = screen.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    host.current?.replaceChildren(...copy.childNodes);
  }, [screen]);
  return <div ref={host} className="app swipe-under" inert aria-hidden="true"/>;
}
const distance = (a: number, b: number) => Math.abs(Math.floor(a / 9) - Math.floor(b / 9)) + Math.abs(a % 9 - b % 9);

export default function SudokuGame() {
  const [game, setGame] = useState<GameState | null>(null);
  const [selected, setSelected] = useState(0);
  const boardWrap = useRef<HTMLDivElement>(null);
  const [focusedDigit, setFocusedDigit] = useState<number | null>(null);
  const [entry, setEntry] = useState<EntryModeState>(INITIAL_ENTRY_MODE);
  const [colorMode, setColorMode] = useState(false);
  const [clockResetRevision, setClockResetRevision] = useState(0);
  const [paused, setPaused] = useState(false);
  const [finish, setFinish] = useState<Finish | null>(null);
  const finishRef = useRef<Finish | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [blockedEntry, setBlockedEntry] = useState<(Rejection & { cells: readonly number[]; value: number; exclusion: boolean; id: number }) | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [undoAnnouncement, setUndoAnnouncement] = useState({ id: 0, text: '' });
  const [focusAnnouncement, setFocusAnnouncement] = useState({ text: '' });
  const [boldAnnouncement, setBoldAnnouncement] = useState({ id: 0, text: '' });
  const [fillAnnouncement, setFillAnnouncement] = useState({ id: 0, text: '' });
  // The click that ends a hold must not also toggle the note, so it checks `fired`. On touch, pointerleave fires before that click.
  const keyHold = useRef<KeyHold | null>(null);
  const toggleBoldLatest = useRef<(value: number) => boolean>(() => false);
  const moveFocus = (digit: number | null) => { setFocusedDigit(digit); setFocusAnnouncement(current => current.text ? { text: '' } : current); };
  const clearFocus = () => moveFocus(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [preferences, setPreferences] = useState(DEFAULT_PREFS);
  // Read through a ref so effects that play a cue do not rerun when the setting changes.
  const hapticsOn = useRef(DEFAULT_PREFS.haptics);
  useEffect(() => { hapticsOn.current = preferences.haptics; }, [preferences.haptics]);
  const haptic = useCallback((kind: Haptic) => { if (hapticsOn.current) playHaptic(kind); }, []);
  const [offlineReady, setOfflineReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const worker = useRef<Worker | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const rejectionId = useRef(0);
  // Keep `game` in this state: it hides the hint after any board change, so Apply never writes a stale move.
  const [hintState, setHintState] = useState<{ game: GameState; level: HintLevel; hint: Hint; line: number } | null>(null);
  const focusAfterRender = useRef<string | null>(null);
  const [lesson, setLesson] = useState<LessonState | null>(null);
  const [held, setHeld] = useState<Held | null>(null);
  const [learnOpen, setLearnOpen] = useState(false);
  const [historyData, setHistoryData] = useState<{ solves: Solve[]; today: string } | null>(null);
  const [monthOpen, setMonthOpen] = useState(false);
  const [replayView, setReplayView] = useState<{ id: string; seconds: number | null } | null>(null);
  const replays = useSyncExternalStore(replayStore.subscribe, replayStore.snapshot, replayStore.serverSnapshot);
  const [view, setView] = useState<'home' | 'game'>('home');
  // `regular` is the stored regular game, read when the open game is a daily.
  const [homeData, setHomeData] = useState<{ seconds: number | null; regular: GameState | null; daily: DailyHome | null; learned: Learned; solved: number }>({ seconds: null, regular: null, daily: null, learned: {}, solved: 0 });
  const [learned, setLearned] = useState<Learned>({});
  const away = held !== null;
  // Watching, reading feedback, or done: the board is for looking at, so nothing may change it.
  const lessonLocked = lesson !== null && (lesson.phase !== 'practice' || lesson.result !== null);
  const hintAdvancedAt = useRef(-Infinity);
  const lessonTappedAt = useRef(-Infinity);
  const [celebration, setCelebration] = useState<{ id: number; origin: number; cells: number[]; label: string } | null>(null);
  const celebrationId = useRef(0);
  const [placed, setPlaced] = useState<{ index: number; id: number } | null>(null);
  const [loneFilled, setLoneFilled] = useState<{ cells: number[]; id: number } | null>(null);
  useEffect(() => { if (!loneFilled) return; const timer = setTimeout(() => setLoneFilled(null), LONE_FILL_MS); return () => clearTimeout(timer); }, [loneFilled]);
  const placedId = useRef(0);
  const complete = game ? isComplete(game) : false;
  const activeHint = hintState && hintState.game === game && !paused && !sheet && !busy && !complete ? hintState : null;
  const hintDisplay = activeHint ? hintView(activeHint.hint, activeHint.level) : null;
  const completedSource = complete ? game?.source : undefined;
  useEffect(() => { if (completedSource) updateHistory(history => recordCompleted(history, completedSource)); }, [completedSource]);
  const noteGame = useCallback((id: string, flags: Partial<Omit<Evidence, 'fresh'>> & { fresh: boolean }) => {
    if (id.startsWith('lesson-')) return;
    try {
      const log = readEvidence(localStorage.getItem(EVIDENCE_KEY));
      const next = noteEvidence(log, id, flags);
      if (next !== log) localStorage.setItem(EVIDENCE_KEY, serializeEvidence(next));
    } catch { /* Without storage no solve is clean. */ }
  }, []);
  useEffect(() => {
    if (!game || away || complete) return;
    noteGame(game.id, { fresh: !game.history.length && game.values.every((value, i) => value === game.givens[i]),
      fixed: game.values.some((value, i) => value && value !== game.solution[i]), blocked: preferences.blockIncorrectAnswers });
  }, [game, away, complete, preferences.blockIncorrectAnswers, noteGame]);
  // A save that loads already finished was solved on an earlier day, so History doesn't record it as today's.
  const restoredSolved = useRef<string | null>(null);
  const solvedId = complete && !away ? game?.id : undefined;
  const solvedDifficulty = solvedId ? game?.difficulty : undefined;
  const solvedGivens = solvedId ? game?.givens.join('') : undefined;
  const solvedSource = solvedId ? game?.source : undefined;
  // Read once per solve: the clock saves its final time when it stops, which happens before this effect runs, and
  // History must be read before this solve is added. Coming back to the same solve (after a lesson) keeps the result.
  useEffect(() => {
    if (!solvedId || !solvedDifficulty || !solvedGivens) return;
    storeSolved(solvedId);
    if (finishRef.current?.id === solvedId) return;
    const result: Finish = { id: solvedId, seconds: null, best: null, recorded: false, earned: null };
    try {
      result.seconds = savedSeconds(localStorage.getItem(clockKey(solvedId)), solvedId);
      const solves = readSolves(localStorage.getItem(SOLVES_KEY));
      result.best = levelStats(solves)[solvedDifficulty].best;
      const today = dayKey(new Date());
      const evidence = readEvidence(localStorage.getItem(EVIDENCE_KEY))[solvedId];
      const clean = isClean(evidence);
      const recording = result.seconds !== null && solvedId !== restoredSolved.current && !solves.some(s => s.id === solvedId);
      if (recording) {
        localStorage.setItem(SOLVES_KEY, serializeSolves(recordSolve(solves, { id: solvedId, difficulty: solvedDifficulty, seconds: result.seconds!, day: today, givens: solvedGivens, ...(clean ? { clean: true } as const : {}) })));
        result.recorded = true;
      }
      const daily = dailyOf(solvedId);
      // Counted for the day in its id, so a daily finished after midnight still counts for the day it was.
      const dailySolves = daily && solvedId !== restoredSolved.current ? recordDailySolve(readDailySolves(localStorage.getItem(DAILY_SOLVES_KEY)), { day: daily.day, level: daily.level, seconds: result.seconds ?? 0 }) : null;
      if (dailySolves) localStorage.setItem(DAILY_SOLVES_KEY, serializeDailySolves(dailySolves));
      const accomplishments = readAccomplishments(localStorage.getItem(ACCOMPLISHMENTS_KEY));
      if (recording) {
        const firstAtLevel = isFirstAtLevel({ level: solvedDifficulty, solveId: solvedId, historyLevels: solves.map(s => s.difficulty), solvedIds: readSolved(localStorage.getItem(SOLVED_KEY)),
          expertCompleted: readHistory(localStorage.getItem(HISTORY_KEY)).completed.filter(source => source !== solvedSource).length });
        const { earned, shown } = earnAtSolve(accomplishments, { solveId: solvedId, day: today, level: solvedDifficulty, streak: dailySolves ? dailyStreak(dailySolves, today) : null, firstAtLevel, clean });
        if (Object.keys(earned).length !== Object.keys(accomplishments).length) localStorage.setItem(ACCOMPLISHMENTS_KEY, serializeAccomplishments(earned));
        result.earned = shown;
      } else if (!evidence?.restarted) result.earned = earnedBy(accomplishments, { solveId: solvedId, clean: solves.find(s => s.id === solvedId)?.clean === true });
    } catch { /* History, the time, the best, and accomplishments are optional. */ }
    finishRef.current = result;
    setFinish(result);
  }, [solvedId, solvedDifficulty, solvedGivens, solvedSource]);
  const shownFinish = complete && finish?.id === game?.id ? finish : null;
  const finishSeconds = shownFinish && !preferences.hideTimer ? shownFinish.seconds : null;
  const newBest = Boolean(shownFinish?.recorded) && isNewBest(finishSeconds, shownFinish?.best ?? null);
  const finishReplay = shownFinish ? replays.find(r => r.id === shownFinish.id && r.steps.length > 0) : undefined;
  const finishCounts = useMemo(() => finishReplay && game ? replayStats(finishReplay, game.solution) : null, [finishReplay, game]);
  const finishShare = useMemo<ShareSource | null>(() => shownFinish && game ? { givens: game.givens, solution: game.solution, replay: finishReplay, day: dailyOf(game.id)?.day ?? null, theme: preferences.theme } : null, [shownFinish, game, finishReplay, preferences.theme]);
  // The cell the last selection tick was for, so repeated pointer samples on one cell stay silent.
  const lastTicked = useRef(0);
  useEffect(() => { lastTicked.current = selected; }, [selected]);
  const selectCell = (index: number) => {
    if (index !== lastTicked.current) { lastTicked.current = index; haptic('select'); }
    setSelected(index); setBlockedEntry(null);
    if (game?.values[index]) moveFocus(game.values[index]);
  };
  const selection = useNoteSelection({
    values: game?.values, enabled: Boolean(game) && !paused && !busy && !sheet && !complete,
    onSelect: selectCell, onBegin: ({ replacing }) => { if (!replacing) setEntry(beginBatch); setBlockedEntry(null); },
    onFocus: ({ index, hasSelection }) => {
      const digit = game?.values[index];
      if (!digit) return;
      if (!hasSelection) selectCell(index);
      moveFocus(digit);
    },
  });
  // iOS swipe-back: where the swipe returns, fixed when it starts so the underlay cannot change as the screen does.
  const [swiping, setSwiping] = useState<'home' | 'learn' | 'game' | null>(null);
  const swipeDestination = useRef<'home' | 'learn' | 'game' | null>(null);
  const [gameCopy, setGameCopy] = useState<HTMLElement | null>(null);
  const copyGameScreen = () => { if (process.env.NEXT_PUBLIC_BUILD_TARGET === 'ios') setGameCopy(document.querySelector<HTMLElement>('.app:not(.swipe-under)')?.cloneNode(true) as HTMLElement ?? null); };
  const startSwipe = useRef(() => {});
  // Layout effects: React holds plain effects until a screen transition ends, and a swipe can start before that.
  useLayoutEffect(() => { startSwipe.current = () => { refreshHome(held ? held.game : game); setLearned(readLearnedNow()); }; });
  useEffect(() => installNativeBack(active => {
    if (active) { startSwipe.current(); flushSync(() => setSwiping(swipeDestination.current)); } else flushSync(() => setSwiping(null));
  }), []);
  const batchSelection = selection.indices.length > 0;
  const mode = activeMode(entry, { batch: batchSelection });
  const notesActive = mode !== 'value';
  const pencil = mode === 'note';
  const excluding = mode === 'exclude';
  const resetSelection = selection.reset;
  const entryDigits = useMemo(() => game ? getEntryDigits({ values: game.values, index: selected }) : [], [game, selected]);
  const numberFocus = !notesActive && (!game || selected < 0 || Boolean(game.values[selected]));
  const filtering = preferences.filterNumberKeys && !numberFocus;
  // A batch digit stays available while at least one selected cell can take it.
  const availableDigits = useMemo(() => !game ? [] : batchSelection ? [...new Set(selection.indices.flatMap(index => getEntryDigits({ values: game.values, index })))] : entryDigits, [game, batchSelection, selection.indices, entryDigits]);

  /** Opens `next` on the game screen, resetting the view the last game left. */
  const startGame = (next: GameState) => {
    resetSelection(); clearFocus(); setBlockedEntry(null); setCelebration(null); setHintState(null); setLoneFilled(null);
    const first = Math.max(0, next.values.indexOf(0));
    setGame(next); setSelected(first);
    // Starting from Home or a sheet leaves focus on a button that unmounts or closes, so the keyboard needs somewhere to go.
    if (!document.activeElement || document.activeElement === document.body || document.activeElement.closest('.sheet')) focusAfterRender.current = `.board [data-index="${first}"]`;
    setDifficulty(next.difficulty);
    setPaused(false); setEntry(INITIAL_ENTRY_MODE); setColorMode(false);
  };
  // The daily last built for Home. A failed build is not retried until the day or level changes; Play builds its own.
  const building = useRef<string | null>(null);
  // The regular game last open, for Home while a daily is open: its save may have failed or storage may be blocked.
  const lastRegular = useRef<GameState | null>(null);
  /** Keeps a daily built for Home, so Home shows it at once and offline. */
  const cacheDaily = (built: GameState) => {
    try {
      localStorage.setItem(dailyGameKey(built.difficulty), JSON.stringify(built));
      if (!readDailyLevel(localStorage.getItem(DAILY_KEY))) localStorage.setItem(DAILY_KEY, serializeDailyLevel(built.difficulty));
    } catch { /* Home builds it again. */ }
    setHomeData(data => data.daily && dailyId(data.daily.today, built.difficulty) === built.id ? { ...data, daily: { ...data.daily, games: { ...data.daily.games, [built.difficulty]: built } } } : data);
  };
  const onWorkerReply = useRef((data: { puzzle?: Puzzle; newCycle?: boolean; error?: string; tag?: Tag }) => { void data; });
  useLayoutEffect(() => {
    onWorkerReply.current = ({ puzzle, newCycle, error, tag }) => {
      if (tag?.home) { if (puzzle) cacheDaily(createGame({ ...puzzle, id: tag.home })); return; }
      if (puzzle) {
        const { source } = puzzle;
        if (source) updateHistory(history => recordSeen(history, { source, newCycle: !tag?.daily && Boolean(newCycle) }));
        startGame(createGame({ ...puzzle, id: tag?.daily ?? puzzle.id }));
      } else setError(error ?? 'Could not create a puzzle. Please try again.');
      setBusy(false);
    };
  });
  const postPuzzle = (request: { difficulty: Difficulty; avoid: string[]; seed?: number; tag?: Tag }) => {
    // Lazy construction keeps the worker available for retry if startup fails.
    if (!worker.current) {
      const nextWorker = new Worker(new URL('../lib/puzzle.worker.ts', import.meta.url));
      nextWorker.onmessage = ({ data }) => onWorkerReply.current(data);
      nextWorker.onerror = () => {
        setError('Could not create a puzzle. Please try again.'); setBusy(false);
        nextWorker.terminate(); worker.current = null;
      };
      worker.current = nextWorker;
    }
    worker.current.postMessage(request);
  };
  const requestPuzzle = (level: Difficulty, { daily }: { daily?: { id: string; seed: number } } = {}) => {
    setView('game'); enterGameEntry(); resetSelection(); clearFocus();
    setBusy(true); setError(''); setBlockedEntry(null); setCelebration(null);
    try { postPuzzle(daily ? { difficulty: level, avoid: [], seed: daily.seed, tag: { daily: daily.id } } : { difficulty: level, avoid: level === 'expert' ? seenPuzzles() : [] }); }
    catch { setBusy(false); setError('Could not create a puzzle. Reload the app to try again.'); }
  };

  useEffect(() => {
    // Not `replaceState({})`: Next.js reloads the page on Back or Forward to an entry missing its own keys.
    if (staleEntry()) window.history.replaceState(Object.fromEntries(Object.entries(window.history.state).filter(([key]) => key !== GAME_ENTRY && key !== REPLAY_ENTRY)), '');
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        const saved = raw ? restore(raw) : null;
        if (saved) {
          setGame(saved); setSelected(saved.values.indexOf(0) === -1 ? 0 : saved.values.indexOf(0));
          setDifficulty(saved.difficulty); setBusy(false);
          // Recorded here as well as on completion so the first Home screen already counts it.
          if (isComplete(saved)) {
            restoredSolved.current = saved.id;
            storeSolved(saved.id);
            const { source } = saved;
            if (source) updateHistory(history => recordCompleted(history, source));
          }
        } else {
          setBusy(false);
          if (raw) setError('Your saved puzzle could not be restored. Pick a new one.');
        }
        refreshHome(saved);
      } catch { setStorageError(true); setBusy(false); refreshHome(null); }
      try {
        const prefs = restorePreferences(localStorage.getItem(PREFS_KEY));
        setPreferences(prefs); document.documentElement.setAttribute('data-theme', prefs.theme);
      } catch { /* Keep the restored puzzle even when preferences cannot be read. */ }
      setInstalled(window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    }, 0);
    return () => { clearTimeout(timer); worker.current?.terminate(); worker.current = null; };
  }, []);

  useEffect(() => {
    // Away from the game, `game` can be a practice board; saving it would overwrite the player's puzzle.
    if (!game || away) return;
    if (!dailyOf(game.id)) lastRegular.current = game;
    let timer: number | undefined;
    try {
      if (!dailyOf(game.id)) localStorage.setItem(SAVE_KEY, JSON.stringify(game));
      else if (storesDaily(game, dayKey(new Date()))) localStorage.setItem(dailyGameKey(game.difficulty), JSON.stringify(game));
    } catch { timer = window.setTimeout(() => setStorageError(true), 0); }
    return () => clearTimeout(timer);
  }, [game, away]);
  // Every change to the board while playing is recorded for replay; lessons are not.
  useEffect(() => { if (game && !away) replayStore.record(game.id, game); }, [game, away]);

  useEffect(() => {
    const onPrompt = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallEvent); };
    const onInstalled = () => { setInstalled(true); setInstallEvent(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    let active = true;
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_BUILD_TARGET !== 'ios' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready).then(() => { if (active) setOfflineReady(true); }).catch(() => { /* Retry on the next visit; gameplay remains available. */ });
    }
    return () => { active = false; window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const syncChrome = () => {
      const dark = preferences.theme === 'dark' || (preferences.theme === 'system' && media.matches);
      document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.setAttribute('content', dark ? THEME_COLOR.dark : THEME_COLOR.light));
      const blackedOut = Boolean(sheet && sheet !== 'restart') && window.matchMedia('(max-width: 600px) and (prefers-reduced-motion: no-preference)').matches;
      setStatusBarText(dark || blackedOut);
    };
    syncChrome(); media.addEventListener('change', syncChrome);
    return () => media.removeEventListener('change', syncChrome);
  }, [preferences.theme, sheet]);

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
  const showSheetPage = (next: 'help' | 'privacy') => { setSheet(next); requestAnimationFrame(() => { dialog.current?.querySelector('.sheet-content')?.scrollTo?.(0, 0); dialog.current?.querySelector<HTMLButtonElement>('.sheet-close')?.focus(); }); };
  const closeSheet = useCallback(({ immediate = false }: { immediate?: boolean } = {}) => {
    const sheet = dialog.current;
    if (!sheet?.open) return;
    if (immediate || 'closing' in sheet.dataset) sheet.close();
    else sheet.dataset.closing = '';
  }, []);
  const sheetDrag = useSheetDrag(closeSheet);
  const focusSelectedCell = () => board.current?.querySelector<HTMLButtonElement>(`[data-index="${selected}"]`)?.focus();
  const restartPuzzle = () => {
    if (!game || busy) return;
    noteGame(game.id, { fresh: false, restarted: true });
    const restarted = restartGame(game);
    replayStore.record(restarted.id, restarted, { restart: true });
    restoredSolved.current = null;
    setGame(restarted); setLoneFilled(null); resetSelection(); clearFocus();
    // The clock may not be mounted (restarting from Home), so the reset has to reach its storage directly.
    try { localStorage.setItem(clockKey(restarted.id), JSON.stringify({ id: restarted.id, seconds: 0 })); } catch { /* The clock tolerates missing storage. */ }
    refreshHome(restarted);
    setSelected(game.givens.indexOf(0)); setEntry(INITIAL_ENTRY_MODE); setColorMode(false);
    setBlockedEntry(null); setCelebration(null); setPaused(false); setFinish(null); finishRef.current = null; setClockResetRevision(value => value + 1);
    closeSheet();
  };
  const chooseMode = (next: EntryMode) => {
    setColorMode(false);
    setBlockedEntry(null);
    if (batchSelection && next === 'value') resetSelection();
    setEntry(state => selectMode(state, { mode: next, batch: batchSelection }));
    focusSelectedCell();
  };
  /** Keyboard N and X: switch to the mode, or back to Numbers when it is already active. */
  const toggleEntryMode = (target: EntryMode) => {
    if (colorMode) { chooseMode(target); return; }
    setBlockedEntry(null);
    if (batchSelection && mode === target) resetSelection();
    setEntry(state => toggleMode(state, { mode: target, batch: batchSelection }));
  };
  const chooseColorMode = () => { setBlockedEntry(null); setColorMode(true); focusSelectedCell(); };
  const paintTargets = batchSelection ? selection.indices : [selected];
  const selectedColor = game && paintTargets.every(i => game.colors[i] === game.colors[paintTargets[0]]) ? game.colors[paintTargets[0]] : null;
  const recolor = (change: (game: GameState) => GameState) => {
    if (!canPaint) return;
    setGame(current => current ? change(current) : current);
    if (batchSelection) clearSelection(); else focusSelectedCell();
  };
  const paint = (color: CellColor) => recolor(current => paintCells(current, { indices: paintTargets, color }));
  const clearSelection = () => {
    resetSelection();
    focusSelectedCell();
  };
  useEffect(() => {
    // A closing sheet restores focus to its opener when it closes, so the target waits until it has.
    if (focusAfterRender.current === null || dialog.current?.open) return;
    // An unrelated render can commit before the one that shows the target, so the target stays pending until it exists.
    const target = [...document.querySelectorAll<HTMLElement>(focusAfterRender.current)].find(element => !element.closest('.swipe-under'));
    if (!target) return;
    // Home's bar buttons sit at the top, so focusing one must not undo the scroll Home came back to.
    target.focus({ preventScroll: Boolean(target.closest('.home-bar')) });
    focusAfterRender.current = null;
  });
  const showHint = () => {
    if (lesson) { if (walkthrough && lesson.line < walkthrough.length - 1) stepWalkthrough(lesson.line + 1); return; }
    if (!game || paused || busy || sheet || complete) return;
    resetSelection();
    if (!activeHint) { setHintState({ game, level: 1, hint: nextHint(game), line: 0 }); return; }
    // Naming the technique keeps a solve clean; showing where to look, or more, does not.
    if (hintDisplay && activeHint.level < hintDisplay.levels) { noteGame(game.id, { fresh: false, assisted: true }); setHintState({ ...activeHint, level: (activeHint.level + 1) as HintLevel, line: 0 }); }
    else if (walkthrough && activeHint.line < walkthrough.length - 1) stepWalkthrough(activeHint.line + 1);
  };
  const applyActiveHint = () => {
    if (!game || !activeHint) return;
    const { hint } = activeHint;
    noteGame(game.id, { fresh: false, assisted: true });
    const next = hint.kind === 'step' ? applyHint(game, hint.step)
      : hint.kind === 'mistake' ? enter(game, hint.digit ? { index: hint.cell, value: hint.digit, exclude: true } : { index: hint.cell, value: 0 }) : game;
    setHintState(null); setBlockedEntry(null); resetSelection();
    if (next !== game) setGame(next);
    const cell = hint.kind === 'step' ? hint.step.placement?.cell ?? hint.step.eliminations[0]?.cell : hint.kind === 'mistake' ? hint.cell : undefined;
    if (cell !== undefined) { setSelected(cell); focusAfterRender.current = `.board [data-index="${cell}"]`; }
    if (cell !== undefined && next.values[cell]) moveFocus(next.values[cell]);
  };
  const toggleBoldNote = (value: number) => {
    if (!game || paused || busy || sheet || complete || lessonLocked || !pencil || colorMode || keyState(value).focusOnly) return false;
    const indices = batchSelection ? selection.indices : [selected];
    const next = toggleBold(game, { indices, value, filterNumberKeys: preferences.filterNumberKeys });
    if (next === game) return false;
    setBlockedEntry(null);
    setGame(next);
    if (batchSelection) selection.markApplied();
    haptic('tap');
    const bolded = indices.some(index => next.bold[index]?.includes(value));
    setBoldAnnouncement(current => ({ id: current.id + 1, text: `Note ${value} ${bolded ? 'bold' : 'plain'}` }));
    return true;
  };
  useLayoutEffect(() => { toggleBoldLatest.current = toggleBoldNote; });
  useEffect(() => () => { if (keyHold.current) clearTimeout(keyHold.current.timer); }, []);
  const startKeyHold = (value: number, pointerId: number) => {
    if (keyHold.current) clearTimeout(keyHold.current.timer);
    keyHold.current = null;
    if (!pencil) return;
    const hold: KeyHold = { key: value, pointerId, fired: false, timer: 0 };
    hold.timer = window.setTimeout(() => { hold.fired = toggleBoldLatest.current(value); }, BOLD_HOLD_MS);
    keyHold.current = hold;
  };
  const endKeyHold = ({ released, pointerId }: { released: boolean; pointerId: number }) => {
    const hold = keyHold.current;
    if (!hold || hold.pointerId !== pointerId) return;
    clearTimeout(hold.timer);
    if (released && hold.fired) hold.releasedAt = performance.now();
  };
  const endsBoldHold = (value: number) => {
    const hold = keyHold.current;
    if (!hold || hold.key !== value) return false;
    keyHold.current = null;
    clearTimeout(hold.timer);
    return hold.fired && hold.releasedAt !== undefined && performance.now() - hold.releasedAt < 1000;
  };
  const fillLone = (next: GameState) => {
    if (!preferences.fillLoneNotes || lesson || !game) return next;
    const { game: filled, cells } = fillLoneNotes(next, { blockIncorrectAnswers: preferences.blockIncorrectAnswers });
    if (!cells.length) return next;
    setLoneFilled({ cells, id: ++placedId.current });
    setFillAnnouncement(current => ({ id: current.id + 1, text: cells.map(i => `Filled ${filled.values[i]} in row ${Math.floor(i / 9) + 1}, column ${i % 9 + 1}`).join('. ') }));
    return filled;
  };
  const input = (value: number) => {
    if (!game || paused || busy || sheet || complete || lessonLocked) return;
    lessonTappedAt.current = -Infinity;
    if (value !== 0 && (numberFocus || keyState(value).focusOnly)) {
      const clearing = focusedDigit === value;
      setFocusedDigit(clearing ? null : value); setBlockedEntry(null);
      setFocusAnnouncement({ text: clearing ? 'Focus cleared' : `Focused on ${value}` });
      return;
    }
    const refusedCells = batchSelection && excluding && preferences.blockIncorrectAnswers ? incorrectExclusions(game, { indices: selection.indices, value }) : [];
    const refused = batchSelection ? refusedCells.length ? { kind: 'answer' as const, sources: [], unit: null } : null
      : rejectEntry(game, { index: selected, value, pencil, exclude: excluding, blockIncorrectAnswers: preferences.blockIncorrectAnswers, filterNumberKeys: filtering });
    if (refused) { haptic('error'); setBlockedEntry({ ...refused, cells: batchSelection ? selection.indices : [selected], value, exclusion: excluding, id: ++rejectionId.current }); return; }
    setBlockedEntry(null);
    if (batchSelection) {
      if (!value) { clearSelection(); return; }
      const batch = { indices: selection.indices, value, filterNumberKeys: preferences.filterNumberKeys };
      const next = excluding ? toggleExclusions(game, { ...batch, blockIncorrectAnswers: preferences.blockIncorrectAnswers }) : toggleNotes(game, batch);
      if (next === game) return;
      const filled = fillLone(next);
      setGame(filled);
      selection.markApplied();
      if (filled !== next && isComplete(filled)) { setCelebration({ id: ++celebrationId.current, origin: selected, cells: [...Array(81).keys()], label: '' }); haptic('success'); } else haptic('tap');
    } else {
      const entered = enter(game, { index: selected, value, pencil, exclude: excluding, blockIncorrectAnswers: preferences.blockIncorrectAnswers, filterNumberKeys: preferences.filterNumberKeys });
      if (entered === game) return;
      const next = fillLone(entered);
      setGame(next);
      if (value && !pencil && !excluding) setPlaced({ index: selected, id: ++placedId.current });
      if (value && !pencil && !excluding) moveFocus(value);
      if (next !== entered && isComplete(next)) {
        setCelebration({ id: ++celebrationId.current, origin: selected, cells: [...Array(81).keys()], label: '' });
        haptic('success');
      } else if (!pencil && !excluding && value) {
        const units = completedUnits({ before: game.values, after: entered.values, index: selected });
        const finished = isComplete(next);
        if (finished || units.length) {
          const label = finished ? '' : celebrationLabel(units);
          const cells = finished ? [...Array(81).keys()] : [...new Set(units.flatMap(unit => unit.cells))];
          setCelebration({ id: ++celebrationId.current, origin: selected, cells, label });
        }
        haptic(finished ? 'success' : units.length ? 'unit' : 'tap');
      } else if (value) haptic('tap');
    }
  };
  const step = (direction: Recovery['direction']) => {
    if (!game || paused || busy || lessonLocked || complete) return;
    const next = direction === 'undo' ? undo(game) : redo(game);
    if (next === game) return;
    resetSelection(); setBlockedEntry(null); setCelebration(null); setPlaced(null); setLoneFilled(null);
    setGame(next);
    // Described in the order it was played, so undoing an exclusion is still an exclusion.
    const action = direction === 'undo' ? describeAction(next, game) : describeAction(game, next);
    setUndoAnnouncement(current => ({ id: current.id + 1, text: action ? announce({ direction, action }) : '' }));
  };
  const doUndo = () => step('undo');
  const doRedo = () => step('redo');
  const handleKey = (event: KeyboardEvent) => {
    if (sheet || paused || busy || !game || (event.target as HTMLElement).closest('dialog')) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) doRedo(); else doUndo(); focusSelectedCell(); return; }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const movement: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 };
    if (event.key === 'Escape') { event.preventDefault(); if (activeHint) { setHintState(null); focusSelectedCell(); } else clearSelection(); return; }
    if (event.key in movement) {
      event.preventDefault();
      const next = (selected + movement[event.key] + 81) % 81;
      resetSelection(); selectCell(next); board.current?.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)?.focus();
    } else if (colorMode && (/^[0-9]$/.test(event.key) || ['Backspace', 'Delete'].includes(event.key))) { event.preventDefault(); if (/^[3-9]$/.test(event.key)) return; paint(event.key === '1' ? 1 : event.key === '2' ? 2 : 0); }
    else if (event.shiftKey && pencil && /^(Digit|Numpad)[1-9]$/.test(event.code) && !/^[1-9]$/.test(event.key)) { event.preventDefault(); if (!event.repeat) toggleBoldNote(Number(event.code.at(-1))); focusSelectedCell(); }
    else if (/^[1-9]$/.test(event.key)) { event.preventDefault(); if (!event.repeat) input(Number(event.key)); focusSelectedCell(); }
    else if (['Backspace','Delete','0'].includes(event.key)) { event.preventDefault(); input(0); focusSelectedCell(); }
    else if (event.key.toLowerCase() === 'h') { event.preventDefault(); if ((event.target as Element).closest('.digit-focus-bar, .game-bar .hint-button')) focusAfterRender.current = HINT_STRIP_FOCUS; showHint(); }
    else if (event.key.toLowerCase() === 'x') { event.preventDefault(); toggleEntryMode('exclude'); }
    else if (event.key.toLowerCase() === 'n') { event.preventDefault(); toggleEntryMode('note'); }
    else if (event.key.toLowerCase() === 'c') { event.preventDefault(); if (colorMode) chooseMode('value'); else chooseColorMode(); }
  };
  const badCells = useMemo(() => game && preferences.blockIncorrectAnswers ? new Set(game.values.flatMap((value, i) => value && value !== game.solution[i] ? [i] : [])) : new Set<number>(), [game, preferences.blockIncorrectAnswers]);
  const related = useMemo(() => new Set(peers(selected)), [selected]);
  const outlineEdges = useMemo(() => selectionEdges(selection.indices), [selection.indices]);
  const selectedValue = focusedDigit ?? 0;
  const values = game?.values;
  const boardKey = values?.join('') ?? '';
  const exclusions = game?.exclusions;
  const candidates = useMemo(() => values && exclusions ? getPlayableCandidates({ values, exclusions }) : null,
    [values, exclusions]);
  const walkStep = activeHint?.level === 3 && activeHint.hint.kind === 'step' ? activeHint.hint.step : null;
  const lessonStep = useMemo(() => lesson?.phase === 'watch' ? findStep(lesson.start.values, getPlayableCandidates(lesson.start)) : lesson?.result && !lesson.result.correct ? lesson.result.step : null, [lesson?.phase, lesson?.start, lesson?.result]);
  const shownStep = lesson ? lessonStep : walkStep;
  const walkthrough = useMemo(() => shownStep && values && candidates ? explainStep(shownStep, { values, candidates }) : null, [shownStep, values, candidates]);
  const walkIndex = walkthrough ? Math.min((lesson ? lesson.line : activeHint?.line) ?? 0, walkthrough.length - 1) : 0;
  const walkLine = walkthrough?.[walkIndex] ?? null;
  const stepWalkthrough = (line: number, at?: number) => {
    if (!walkthrough || (!activeHint && !lesson)) return;
    // Keep focus inside the app's key handler: Safari leaves it on <body> after a click, a disabled stepper button drops it, and leaving the last step removes Apply.
    const focused = document.activeElement, lost = !focused || focused === document.body || focused.matches('.walk-panel p');
    if (lost || focused.closest('.walk-panel, .hint-strip, .lesson-coach')) focusAfterRender.current = line >= walkthrough.length - 1 ? lesson ? LESSON_ACTION_FOCUS : HINT_STRIP_FOCUS : line === 0 || lost || focused.closest('.hint-strip') ? WALK_NEXT_FOCUS : null;
    if (at !== undefined) hintAdvancedAt.current = at;
    if (lesson) setLesson({ ...lesson, line }); else if (activeHint) setHintState({ ...activeHint, line });
  };
  const lessonBoards = lesson ? LESSON_BANK[lesson.id] : [];
  const showBoard = (start: GameState) => { setGame(start); setLoneFilled(null); resetSelection(); setBlockedEntry(null); clearFocus(); setCelebration(null); setSelected(Math.max(0, start.values.indexOf(0))); };
  /** Home's numbers come from storage, read when Home is shown rather than during render. */
  function refreshHome(current: GameState | null) {
    const regular = current && !dailyOf(current.id) ? current : lastRegular.current ?? storedRegular();
    try { if (localStorage.getItem('sudoku.focus-hold-learned.v1') !== null) localStorage.removeItem('sudoku.focus-hold-learned.v1'); } catch { /* Nothing reads it. */ }
    try { setHomeData({ seconds: regular ? savedSeconds(localStorage.getItem(clockKey(regular.id)), regular.id) : null, regular, daily: readDailyHome(regular), learned: readLearned(localStorage.getItem(LEARNED_KEY)), solved: solvedCount(readSolved(localStorage.getItem(SOLVED_KEY)), readHistory(localStorage.getItem(HISTORY_KEY)).completed) }); }
    catch { setHomeData(data => ({ ...data, regular, daily: readDailyHome(regular) })); }
  }
  // A finished iOS swipe has already moved the screen, and under reduced motion a transition only loses taps, so both change at once.
  const move = (type: Move, change: () => void) => {
    if (document.querySelector('.app.swiping') || matchMedia('(prefers-reduced-motion: reduce)').matches) { change(); return; }
    startTransition(() => { addTransitionType(type); change(); });
  };
  const pendingMove = useRef<Move | null>(null);
  const showHome = (focus: string) => { setView('home'); refreshHome(held ? held.game : game); focusAfterRender.current = focus; };
  const goHome = () => { setHintState(null); resetSelection(); setBlockedEntry(null); showHome(game && dailyOf(game.id) ? isComplete(game) ? '.daily-week-link' : '.daily-play' : homeState(game) === 'playing' ? '.resume-row' : '.home-new'); };
  const continueGame = () => move('grow', continueNow);
  const continueNow = () => { setView('game'); enterGameEntry(); focusAfterRender.current = paused ? '.board-cover button' : `.board [data-index="${selected}"]`; };
  /** Switches to a game other than the open one. The switch renders first, so Home's shared board is the one that opens. */
  const switchGame = (next: GameState) => {
    flushSync(() => startGame(next));
    move('grow', () => { setView('game'); enterGameEntry(); focusAfterRender.current = `.board [data-index="${Math.max(0, next.values.indexOf(0))}"]`; });
  };
  const openGame = held ? held.game : game;
  const regularGame = openGame && !dailyOf(openGame.id) ? openGame : homeData.regular;
  const regularUnfinished = Boolean(regularGame && !isComplete(regularGame));
  const continueRegular = () => { if (!regularGame) return; if (regularGame === game) continueGame(); else switchGame(regularGame); };
  const dailyHome = homeData.daily;
  const dailyGame = !dailyHome ? null : openGame?.id === dailyId(dailyHome.today, dailyHome.level) ? openGame : dailyHome.games[dailyHome.level] ?? null;
  const playDaily = () => {
    if (!dailyHome) return;
    // A day can pass with Home open or the app in the background, so the date is read again before the daily opens.
    const daily = dailyHome.today === dayKey(new Date()) ? dailyHome : readDailyHome(regularGame);
    if (daily !== dailyHome) setHomeData(data => ({ ...data, daily }));
    const id = dailyId(daily.today, daily.level);
    const next = openGame?.id === id ? openGame : daily.games[daily.level] ?? null;
    if (next && next === game) { continueGame(); return; }
    if (next) {
      const { source } = next;
      if (source && !next.history.length) updateHistory(history => recordSeen(history, { source, newCycle: false }));
      switchGame(next); return;
    }
    requestPuzzle(daily.level, { daily: { id, seed: dailySeed(daily.today, daily.level) } });
  };
  // Home reads the date again just after midnight and whenever the app comes back, so the new day's daily replaces the last.
  const hasDaily = dailyHome !== null;
  useEffect(() => {
    if (!hasDaily) return;
    const refresh = () => setHomeData(data => data.daily && data.daily.today !== dayKey(new Date()) ? { ...data, daily: readDailyHome(data.regular) } : data);
    let timer = 0;
    // Armed again from the current time on every fire, so a timer that fires early or a clock set back still reaches midnight.
    const arm = () => {
      const now = new Date();
      timer = window.setTimeout(() => { refresh(); arm(); }, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime() + 50);
    };
    const shown = () => { if (document.hidden) return; refresh(); clearTimeout(timer); arm(); };
    arm();
    document.addEventListener('visibilitychange', shown);
    window.addEventListener('pageshow', shown);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', shown); window.removeEventListener('pageshow', shown); };
  }, [hasDaily]);
  // Builds today's daily for Home in the worker; it never takes over the screen.
  const dailyWanted = view === 'home' && !lesson && dailyHome && !dailyGame ? dailyId(dailyHome.today, dailyHome.level) : null;
  useEffect(() => {
    if (!dailyWanted || building.current === dailyWanted) return;
    const daily = dailyOf(dailyWanted)!;
    building.current = dailyWanted;
    try { postPuzzle({ difficulty: daily.level, avoid: [], seed: dailySeed(daily.day, daily.level), tag: { home: dailyWanted } }); } catch { /* Play builds it instead. */ }
  });
  const chooseDailyLevel = (level: Difficulty) => {
    if (!dailyHome) return;
    const id = dailyId(dailyHome.today, level);
    try { localStorage.setItem(DAILY_KEY, serializeDailyLevel(level)); } catch { /* The level holds until Home is read again. */ }
    setHomeData(data => data.daily ? { ...data, daily: { ...data.daily, level, seconds: savedSeconds(readStored(clockKey(id)), id) } } : data);
  };
  const playLevel = (level: Difficulty) => {
    if (regularUnfinished) { setDifficulty(level); openSheet('new'); return; }
    setDifficulty(level); requestPuzzle(level);
  };
  const readLearnedNow = () => { try { return readLearned(localStorage.getItem(LEARNED_KEY)); } catch { return {}; } };
  // Lessons run unpaused (a pause covers the board), so the player's pause is held with the game and restored.
  const hold = () => { if (!held) { setHeld({ game, selected, focus: focusedDigit, entry, colorMode, paused }); setPaused(false); } };
  const restoreGame = () => {
    if (!held) return;
    setGame(held.game); setSelected(held.selected); setHeld(null); setPaused(held.paused);
    resetSelection(); setBlockedEntry(null); setCelebration(null); setEntry(held.entry); setColorMode(held.colorMode); moveFocus(held.focus);
    focusAfterRender.current = `.board [data-index="${held.selected}"]`;
  };
  const openLearn = () => move('push', openLearnNow);
  const openLearnNow = () => {
    if (busy) return;
    hold(); setHintState(null); setLearned(readLearnedNow()); setLearnOpen(true);
    focusAfterRender.current = '.lesson-back';
  };
  /** The Home button steps back through the game's history entry, so it and the back button stay in step. */
  const leaveGame = () => { if (inGameEntry()) { pendingMove.current = 'shrink'; window.history.back(); } else move('shrink', goHome); };
  // Set while undoing a forward step, so the back event that undo causes is not read as the player pressing Back.
  const undoingForward = useRef(false);
  const onHistory = () => {
    const pending = pendingMove.current;
    pendingMove.current = null;
    // React renders updates from a popstate event at once, which skips the view transition, so the animated change waits for the next task.
    if (pending) { setTimeout(() => move(pending, onHistoryNow)); return; }
    onHistoryNow();
  };
  const onHistoryNow = () => {
    if (undoingForward.current) { undoingForward.current = false; return; }
    if (staleEntry()) { window.history.back(); return; }
    if (replayView && !inReplayEntry()) { closeReplay(); return; }
    if (inReplayEntry() && !replayView) { undoingForward.current = true; window.history.back(); return; }
    if (inGameEntry()) {
      if (view !== 'home') return;
      // Forward can only reopen the game from Home itself; elsewhere it is undone so the browser stays on Home's entry.
      if (game && !lesson && !learnOpen && !historyData && !monthOpen && !replayView) continueNow(); else { undoingForward.current = true; window.history.back(); }
      return;
    }
    // Generation has no Home to return to until it finishes, so back is undone.
    if (busy && view === 'game') { enterGameEntry(); return; }
    if (lesson) {
      const fromHint = lesson.from === 'hint';
      closeSheet({ immediate: true }); exitLesson();
      if (fromHint) enterGameEntry();
      return;
    }
    if (view === 'game') { closeSheet({ immediate: true }); goHome(); }
  };
  const onHistoryRef = useRef(onHistory);
  // Layout effects, like the swipe refs: Back or Escape during a screen transition must run this screen's handler.
  useLayoutEffect(() => { onHistoryRef.current = onHistory; });
  useEffect(() => {
    const onPop = () => onHistoryRef.current();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const openHistory = () => move('push', openHistoryNow);
  const openHistoryNow = () => {
    let solves: Solve[] = [];
    try { solves = readSolves(localStorage.getItem(SOLVES_KEY)); } catch { /* An empty history still shows the count. */ }
    setHistoryData({ solves, today: dayKey(new Date()) });
    focusAfterRender.current = '.lesson-back';
  };
  const replayOf = (id: string | undefined) => replays.find(r => r.id === id && r.steps.length > 0);
  const openReplay = () => move('push', openReplayNow);
  const openReplayNow = () => {
    // A second tap before the screen changes would push a second replay entry, which Done cannot close.
    if (inReplayEntry()) return;
    if (!game) return;
    let seconds: number | null = null;
    try { seconds = preferences.hideTimer ? null : savedSeconds(localStorage.getItem(clockKey(game.id)), game.id); } catch { /* The time is optional. */ }
    copyGameScreen();
    setReplayView({ id: game.id, seconds });
    window.history.pushState({ [REPLAY_ENTRY]: PAGE_LOAD, ...(inGameEntry() ? { [GAME_ENTRY]: PAGE_LOAD } : {}) }, '');
    focusAfterRender.current = '.replay-play';
  };
  // Two quick exits would otherwise both step back, past where the replay was opened.
  const closingReplay = useRef(false);
  const exitReplay = () => {
    if (closingReplay.current) return;
    if (inReplayEntry()) { closingReplay.current = true; pendingMove.current = 'pop'; window.history.back(); } else move('pop', closeReplay);
  };
  const closeReplay = () => {
    closingReplay.current = false;
    setReplayView(null);
    focusAfterRender.current = '.replay-button';
  };
  const exitReplayRef = useRef(exitReplay);
  useLayoutEffect(() => { exitReplayRef.current = exitReplay; });
  const replayOpen = replayView !== null;
  useLayoutEffect(() => {
    if (!replayOpen) return;
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') exitReplayRef.current(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [replayOpen]);
  const exitHistory = () => move('pop', () => { setHistoryData(null); showHome('.home-solved-count'); });
  const openMonth = () => move('push', () => { setMonthOpen(true); focusAfterRender.current = '.lesson-back'; });
  const exitMonth = () => move('pop', () => { setMonthOpen(false); showHome('.daily-week-link'); });
  const exitMonthRef = useRef(exitMonth);
  useLayoutEffect(() => { exitMonthRef.current = exitMonth; });
  const exitHistoryRef = useRef(exitHistory);
  useLayoutEffect(() => { exitHistoryRef.current = exitHistory; });
  const historyOpen = historyData !== null;
  useLayoutEffect(() => {
    if (!historyOpen && !monthOpen) return;
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') (monthOpen ? exitMonthRef : exitHistoryRef).current(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [historyOpen, monthOpen]);
  const exitLearn = () => move('pop', () => { setLearnOpen(false); restoreGame(); showHome('.home-all'); });
  const exitLearnRef = useRef(exitLearn);
  useLayoutEffect(() => { exitLearnRef.current = exitLearn; });
  useLayoutEffect(() => {
    if (!learnOpen) return;
    // On the document, so Escape works even when focus has left the page's buttons.
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') exitLearnRef.current(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [learnOpen]);
  const openLesson = (id: LessonId, from: LessonState['from'] = 'hint') => {
    if (busy) return;
    // Returning from a hint's lesson shows the game without the hint, so the copy is taken after the hint closes.
    if (from === 'hint' && process.env.NEXT_PUBLIC_BUILD_TARGET === 'ios') { flushSync(() => setHintState(null)); copyGameScreen(); }
    const start = practiceGame(LESSON_BANK[id][0], 0);
    hold(); setLearnOpen(false); setColorMode(false);
    setLesson({ id, from, phase: 'watch', board: 0, start, result: null, line: 0 });
    setHintState(null); showBoard(start);
    focusAfterRender.current = WALK_NEXT_FOCUS;
  };
  const practiceBoard = (board: number) => {
    if (!lesson) return;
    const start = practiceGame(LESSON_BANK[lesson.id][board], board);
    setLesson({ ...lesson, phase: 'practice', board, start, result: null, line: 0 }); showBoard(start); setColorMode(false);
    setEntry(selectMode(INITIAL_ENTRY_MODE, { mode: lesson.id === 'naked-single' || lesson.id === 'hidden-single' ? 'value' : 'exclude', batch: false }));
    focusAfterRender.current = `.board [data-index="${Math.max(0, start.values.indexOf(0))}"]`;
  };
  const checkPractice = () => {
    if (!lesson || !game) return;
    const result = grade(lesson.id, lesson.start, game);
    if (!result.correct) showBoard(lesson.start); else resetSelection();
    setLesson({ ...lesson, result, line: 0 });
    focusAfterRender.current = result.correct ? LESSON_ACTION_FOCUS : WALK_NEXT_FOCUS;
  };
  const finishLesson = () => {
    if (!lesson) return;
    try { localStorage.setItem(LEARNED_KEY, JSON.stringify(markLearned(readLearned(localStorage.getItem(LEARNED_KEY)), lesson.id, new Date().toISOString().slice(0, 10)))); } catch { /* Learned status is optional. */ }
    setLesson({ ...lesson, phase: 'done', result: null });
    focusAfterRender.current = '.lesson-done button';
  };
  const exitLesson = () => {
    if (!lesson) return;
    setLesson(null);
    if (lesson.from === 'hint') { restoreGame(); return; }
    if (lesson.from === 'home') { restoreGame(); showHome('.home-lesson'); return; }
    if (held) setGame(held.game);
    resetSelection();
    setLearned(readLearnedNow()); setLearnOpen(true);
    focusAfterRender.current = `.learn-row[data-lesson="${lesson.id}"]`;
  };
  const retryPractice = () => {
    if (!lesson) return;
    setLesson({ ...lesson, result: null }); showBoard(lesson.start);
    focusAfterRender.current = `.board [data-index="${Math.max(0, lesson.start.values.indexOf(0))}"]`;
  };
  const lessonState = !lesson ? null : lesson.phase === 'watch' ? 'watch' as const : lesson.result?.correct || lesson.phase === 'done' ? 'correct' as const : lesson.result ? 'wrong' as const : 'practice' as const;
  const lessonAction = !lesson || lesson.phase === 'done' ? null
    : lesson.phase === 'watch' ? { label: 'Start practice' }
    : !lesson.result ? { label: 'Check', disabled: !game || sameBoard(game, lesson.start) }
    : !lesson.result.correct ? { label: 'Try again' }
    : { label: lesson.board < lessonBoards.length - 1 ? 'Next board' : 'Finish' };
  const lessonJustActed = (at: number) => lesson !== null && at >= lessonTappedAt.current && at - lessonTappedAt.current < 350;
  const onLessonAction = (at: number) => {
    // The action changes in place, so a double tap would skip the feedback the first tap revealed. Input in between resets this.
    if (!lesson || lessonJustActed(at)) return;
    lessonTappedAt.current = at;
    if (lesson.phase === 'watch') practiceBoard(1);
    else if (!lesson.result) checkPractice();
    else if (!lesson.result.correct) retryPractice();
    else if (lesson.board < lessonBoards.length - 1) practiceBoard(lesson.board + 1);
    else finishLesson();
  };
  const possible = useMemo(() => candidates && preferences.smartHighlighting && !complete
    ? candidateCells(candidates, selectedValue) : new Set<number>(), [candidates, preferences.smartHighlighting, complete, selectedValue]);
  const excludedPossible = useMemo(() => values && exclusions && preferences.smartHighlighting && !complete
    ? excludedCells({ values, exclusions, digit: selectedValue }) : new Set<number>(), [values, exclusions, preferences.smartHighlighting, complete, selectedValue]);
  const filled = game ? game.values.filter(Boolean).length - game.givens.filter(Boolean).length : 0;
  const total = game ? game.givens.filter(n => !n).length : 1;
  const editable = game && !game.givens[selected] && !busy && !paused && !complete;
  // Keys never refuse a tap: a key that cannot annotate or enter here switches focus to its number instead.
  const keyState = (n: number) => {
    const remaining = Math.max(0, 9 - (game?.values.filter(v => v === n).length ?? 0));
    const marked = !batchSelection && game ? (excluding ? game.exclusions : pencil ? game.notes : [])[selected]?.includes(n) : false;
    const filtered = Boolean((batchSelection || editable) && filtering && !availableDigits.includes(n) && !marked);
    const focusOnly = !remaining || filtered || (!batchSelection && !numberFocus && (selected < 0 || Boolean(game?.values[selected])));
    return { remaining, filtered, focusOnly };
  };
  const canPaint = Boolean(game && !paused && !busy && !complete && !lessonLocked && !walkLine);
  const paintable = canPaint && paintTargets.some(i => game && !game.givens[i]);
  const canErase = Boolean(!batchSelection && editable && (game.values[selected] || game.notes[selected].length || game.exclusions[selected].length));

  const lessonDone = lesson ? lesson.phase === 'done' ? lessonBoards.length - 1 : lesson.phase === 'practice' ? lesson.board - 1 + (lesson.result?.correct ? 1 : 0) : 0 : 0;
  const clockId = held ? held.game?.id : game?.id;
  const replaying = replayView && game ? replayOf(replayView.id) : undefined;
  const dailyView = dailyHome && { today: dailyHome.today, level: dailyHome.level, game: dailyGame, seconds: preferences.hideTimer ? null : dailyHome.seconds, started: Boolean(dailyGame?.history.length) || Boolean(dailyHome.seconds), done: dailyHome.solved.some(solve => solve.day === dailyHome.today && solve.level === dailyHome.level), solvedDays: new Set(dailyHome.solved.map(solve => solve.day)), streak: dailyStreak(dailyHome.solved, dailyHome.today) };
  const homeScreen = <Home daily={dailyView} resume={regularGame && regularUnfinished ? { game: regularGame, seconds: preferences.hideTimer ? null : homeData.seconds } : null} learned={LESSON_BANDS.flatMap(band => band.lessons).filter(id => homeData.learned[id]).length}
      next={nextLesson(homeData.learned)} solved={homeData.solved} shared={dailyHome && openGame?.id === dailyId(dailyHome.today, dailyHome.level) ? 'daily' : openGame && openGame === regularGame && regularUnfinished ? 'regular' : null}
      onDaily={playDaily} onLevel={chooseDailyLevel} onMonth={openMonth} onContinue={continueRegular} onPlay={playLevel} onLesson={id => openLesson(id, 'home')} onLearn={openLearn} onSettings={() => openSheet('settings')} onHistory={openHistory} onInstall={installed || process.env.NEXT_PUBLIC_BUILD_TARGET === 'ios' ? undefined : () => openSheet('install')}
      notice={<>{error && <div className="notice" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss message"><Icon name="close" size={16}/></button></div>}{storageError && <p className="storage-warning" role="status">Saving is unavailable in this browser. Keep this tab open to continue your puzzle.</p>}</>}/>;
  const swipeTarget = replayView ? 'game' : historyData || monthOpen || learnOpen ? 'home' : lesson ? ({ hint: 'game', list: 'learn', home: 'home' } as const)[lesson.from] : view === 'game' ? 'home' : null;
  // A layout effect for the same reason as `startSwipe`: a swipe can start during a screen transition.
  useLayoutEffect(() => { swipeDestination.current = swipeTarget; });
  const swipeUnder = !swiping ? null
    : swiping === 'home' ? <div className="app swipe-under" inert aria-hidden="true">{homeScreen}</div>
    : swiping === 'learn' ? <div className="app swipe-under" inert aria-hidden="true"><LearnPage learned={learned} onOpen={() => {}} onExit={() => {}}/></div>
    : swiping === 'game' && gameCopy ? <SwipeCopy screen={gameCopy}/> : null;
  const gameMeta = <>
    {game && dailyOf(game.id) ? <span className="difficulty-button daily-label"><LevelBars level={game.difficulty}/><span>Daily · <span className="capitalize">{game.difficulty}</span></span></span> : <button className="difficulty-button" disabled={busy} onClick={() => { setDifficulty(game?.difficulty ?? 'easy'); openSheet('new'); }} aria-label={`Difficulty: ${game?.difficulty ?? 'easy'}. Start a new puzzle`}><LevelBars level={game?.difficulty ?? 'easy'}/><span className="capitalize">{game?.difficulty ?? 'easy'}</span><Icon name="chevron" size={14}/></button>}
    <div className="time-controls">{clockId ? <Clock key={clockId} id={clockId} storageKey={clockKey(clockId)} resetRevision={clockResetRevision} hidden={preferences.hideTimer} running={!paused && !sheet && !busy && !complete && !away}/> : <span className="clock">00:00</span>}<button className="pause-button" aria-label={paused ? 'Resume game' : 'Pause game'} disabled={busy || complete || !game} onClick={() => { resetSelection(); setBlockedEntry(null); setCelebration(null); setPaused(value => !value); }}><Icon name={paused ? 'play' : 'pause'} size={15}/></button></div>
  </>;
  const onHome = view === 'home' && !lesson;
  const screen: Screen = replayView && replaying && game ? 'replay' : historyData ? 'history' : monthOpen && dailyHome ? 'daily' : learnOpen ? 'learn' : onHome ? 'home' : 'game';
  // Pushed screens open at their top. A layout effect, so a view transition's new snapshot is taken after the scroll.
  const shownScreen = useRef(screen);
  const scrollPositions = useRef<Partial<Record<Screen, number>>>({});
  useEffect(() => {
    const record = () => { scrollPositions.current[shownScreen.current] = scrollY; };
    addEventListener('scroll', record, { passive: true });
    return () => removeEventListener('scroll', record);
  }, []);
  useLayoutEffect(() => {
    if (shownScreen.current === screen) return;
    shownScreen.current = screen;
    scrollTo(0, screen === 'home' || screen === 'game' ? scrollPositions.current[screen] ?? 0 : 0);
  }, [screen]);
  return <>{swipeUnder}<ViewTransition key={screen} enter={SCREEN_ENTER} exit={SCREEN_EXIT} default="none"><div className="app" onKeyDown={screen === 'game' ? handleKey : undefined}>
    {screen === 'replay' && replaying && game ? <ReplayPage replay={replaying} givens={game.givens} solution={game.solution} level={game.difficulty} seconds={replayView?.seconds ?? null} back="Your game" onExit={exitReplay}/>
    : screen === 'daily' && dailyHome ? <DailyPage solved={dailyHome.solved} today={dailyHome.today} onExit={exitMonth}/>
    : screen === 'history' && historyData ? <HistoryPage hideTimer={preferences.hideTimer} solves={historyData.solves} total={homeData.solved} today={historyData.today} onExit={exitHistory}/>
    : screen === 'learn' ? <LearnPage learned={learned} onOpen={id => openLesson(id, 'list')} onExit={exitLearn}/>
    : <>{onHome ? busy && !game ? <header className="app-bar"><h1 className="brand"><AppMark small/><span>Sudoclue</span></h1></header> : homeScreen : <>
    {lesson && <LessonBar name={lessonName(lesson.id)} done={lessonDone} current={lesson.phase === 'practice' ? lesson.board - 1 : null} count={lessonBoards.length - 1} back={{ hint: 'Your game', list: 'Learn', home: 'Home' }[lesson.from]} onExit={exitLesson}/>}
    {/* Lessons hide the bar but keep it mounted, so the clock is never remounted. */}
    <GameBar meta={gameMeta} hidden={Boolean(lesson)} onHome={leaveGame} homeDisabled={busy} onHint={() => { focusAfterRender.current = HINT_STRIP_FOCUS; showHint(); }} hintDisabled={!game || complete || paused || busy} onSettings={() => openSheet('settings')}/>

    <main className="game play">
      <div className="puzzle-panel">
      <div className={`digit-focus-bar ${hintDisplay ? 'hint-strip' : ''} ${lesson || paused || complete ? 'lesson-hidden' : ''}`} role={hintDisplay ? 'group' : undefined} aria-label={hintDisplay ? 'Hint' : undefined} inert={paused || busy || complete || !game}>
        {hintDisplay ? <>
          <span className="hint-copy" aria-hidden="true"><Icon name="bulb" size={18}/><span>{hintDisplay.text}</span></span>
          {/* Next becomes Apply in place, so Apply ignores taps just after Next; a double-tap on Next would otherwise make the move. */}
          {hintDisplay.action !== 'none' && (!walkthrough || walkIndex >= walkthrough.length - 1) && <button className="hint-action" onClick={event => { if (hintDisplay.action === 'next') { hintAdvancedAt.current = event.timeStamp; if (activeHint?.level === 2 && activeHint.hint.kind === 'step') focusAfterRender.current = WALK_NEXT_FOCUS; showHint(); } else if (event.timeStamp - hintAdvancedAt.current > 350) applyActiveHint(); }}>{hintDisplay.action === 'apply' ? 'Apply' : 'Next'}</button>}
          <button className="clear-focus-button" aria-label="Close hint" title="Close hint" onClick={() => { setHintState(null); focusSelectedCell(); }}><Icon name="close" size={16}/></button>
        </> : null}
      </div>

      <p className="sr-only" role="status">{focusAnnouncement.text && !complete ? focusAnnouncement.text : ''}</p>
      <p className="sr-only" role="status">{walkLine && walkthrough ? `${lesson ? lessonName(lesson.id) : hintDisplay?.text}. Step ${walkIndex + 1} of ${walkthrough.length}. ${walkLine.text}` : hintDisplay?.label ?? ''}</p>
      <ViewTransition name="board" share={BOARD_SHARE} default="none"><div ref={boardWrap} className={`board-wrap ${complete ? 'is-complete' : ''} ${walkLine ? 'walkthrough' : ''}`}>
        <div className="board" role="grid" aria-label="Sudoku puzzle" aria-rowcount={9} aria-colcount={9} ref={board} {...selection.pointerHandlers} aria-multiselectable={batchSelection} aria-busy={busy} inert={paused || busy}>
          {Array.from({ length: 9 }, (_, row) => <div role="row" className="board-row" key={row}>
            {Array.from({ length: 9 }, (_, col) => {
              const i = row * 9 + col;
              const value = game?.values[i] ?? 0;
              const given = Boolean(game?.givens[i]);
              const notes = game?.notes[i] ?? EMPTY_NOTES;
              const ruledOut = game?.exclusions[i] ?? EMPTY_NOTES;
              const generated = game?.noteOrigins[i] === 'generated';
              const color = game?.colors[i] ?? 0;
              const selectedCell = (batchSelection ? selection.indices.includes(i) : selected === i) && !complete;
              const same = value > 0 && selectedValue === value;
              const classes = ['cell', given ? 'given' : 'entered', selectedCell ? 'selected' : '', !selectedCell && related.has(i) && preferences.highlightPeers && !complete ? 'related' : '', same && !selectedCell && !complete ? 'matching' : '', same && focusedDigit === value && !complete && !walkLine ? 'focused' : '', possible.has(i) ? 'possible' : '', excludedPossible.has(i) ? 'excluded-possible' : '', badCells.has(i) ? 'conflict' : '', color && !walkLine ? `painted paint-${COLOR_NAMES[color]}` : '', rejection?.cells.includes(i) ? 'rejecting' : '', ...(walkLine ? walkClasses(walkLine, i) : [...(hintDisplay?.cells.get(i) ?? [])].map(role => `hint-${role}`))].filter(Boolean).join(' ');
              const sides = selectedCell && !walkLine ? batchSelection ? outlineEdges.get(i) : null : undefined;
              return <div role="gridcell" aria-selected={selectedCell} aria-readonly={given} aria-rowindex={row+1} aria-colindex={col+1} key={i} className="cell-slot"><button className={classes} data-index={i} data-given={given} tabIndex={selected === i ? 0 : -1} aria-label={`Row ${row+1}, column ${col+1}, ${value ? `${value}${given ? ', given' : ''}` : notes.length ? `${generated ? 'generated notes' : 'notes'} ${notes.map(n => game?.bold[i].includes(n) ? `${n} bold` : n).join(', ')}` : 'empty'}${!value && ruledOut.length ? `, ruled out ${ruledOut.join(', ')}` : ''}${possible.has(i) ? `, possible placement for ${selectedValue}` : ''}${excludedPossible.has(i) ? `, excluded placement for ${selectedValue}` : ''}${badCells.has(i) ? ', incorrect answer' : ''}${color ? `, ${COLOR_NAMES[color]}` : ''}`} aria-disabled={complete} data-chip={walkLine ? marks(walkLine.chips, i) : undefined} data-strike={walkLine ? marks(walkLine.strike, i) : undefined} onClick={event => selection.clickCell(event, i)}>
                {celebrating && celebratedCells.has(i) && <span key={`celebrate-${celebrating.id}`} className="unit-celebration" style={{ animationDelay: `${distance(i, celebrating.origin) * CELEBRATION_STEP_MS}ms` }} aria-hidden="true"/>}
                {value && loneFilled?.cells.includes(i) ? <><span key={`lone-${loneFilled.id}`} className="lone-fill-ring" aria-hidden="true"/><span key={`lone-number-${loneFilled.id}`} className="cell-number lone-filled">{value}</span></>
                  : value ? placed?.index === i && !given ? <span key={placed.id} className="cell-number placed" onAnimationEnd={() => setPlaced(null)}>{value}</span> : <span className="cell-number">{value}</span> : null}
                {walkLine?.ghost?.cell === i && <span className="walk-ghost" aria-hidden="true">{walkLine.ghost.digit}</span>}
                <CellNotes key={game?.id} focusedDigit={complete || walkLine ? null : focusedDigit} filled={Boolean(value)} manual={generated ? EMPTY_NOTES : notes} automatic={generated ? notes : EMPTY_NOTES} excluded={ruledOut} bold={game?.bold[i] ?? EMPTY_NOTES} boardKey={boardKey}/>
                {rejection?.cells.includes(i) && <span key={`rejected-${rejection.id}`} className="rejected-digit" aria-hidden="true">{rejection.value}</span>}
                {rejection?.sources.includes(i) && <span key={`source-${rejection.id}`} className="rejection-source" aria-hidden="true"/>}
                {badCells.has(i) && <span className="conflict-dot"/>}
              </button>{sides === null ? <m.span layoutId="selection-outline" className="selection-outline" transition={SPRINGS.snappy} aria-hidden="true"/> : sides && <span className={`selection-outline group ${sides.map(side => `edge-${side}`).join(' ')}`} aria-hidden="true"/>}</div>;
            })}
          </div>)}
        </div>
        {walkLine && <WalkthroughLinks line={walkLine} wrap={boardWrap}/>}
        {(paused || busy || !game) && <div className="board-cover">
          {busy ? <><span className="spinner"/><h2>Getting your puzzle ready</h2></> : paused ? <><span className="pause-emblem"><Icon name="pause" size={28}/></span><h2>Take a break</h2><p>Your puzzle will be right here.</p><button className="primary-button" onClick={() => setPaused(false)}><Icon name="play" size={17}/>Resume puzzle</button></> : <><h2>Let’s try that again</h2><button className="primary-button" onClick={() => requestPuzzle(difficulty)}>Create puzzle</button></>}
        </div>}
      </div></ViewTransition>
      <p className="sr-only" role="status">{shownFinish && game ? finishSummary(game.difficulty, finishSeconds, newBest, shownFinish.earned) : celebrating?.label ?? ''}</p>

      </div>

      <div className="progress-line" role="progressbar" aria-label="Cells filled" aria-valuemin={0} aria-valuemax={total} aria-valuenow={filled}><span style={{ transform: `scaleX(${filled/total})` }}/></div>
      <div className="play-side">
      {complete ? shownFinish && game && finishShare && <FinishCard level={game.difficulty} seconds={finishSeconds} best={finishSeconds === null ? null : shownFinish.best} newBest={newBest} earned={shownFinish.earned} counts={finishCounts} share={finishShare} onReplay={finishReplay ? openReplay : undefined} onPlayAgain={() => openSheet('new')}/> : <>
        {/* A lesson action reveals the keypad under the finger, so a quick second tap must not land on it. */}
        <div className="controls-area" onMouseDownCapture={event => { if (lessonJustActed(event.timeStamp)) event.preventDefault(); }} onClickCapture={event => { if (lessonJustActed(event.timeStamp)) { event.preventDefault(); event.stopPropagation(); } }}>
          {lesson && lessonState && lesson.phase !== 'done' && <LessonCoach name={lessonName(lesson.id)} state={lessonState} action={lessonAction && { ...lessonAction, onClick: onLessonAction }}
            walk={walkLine && walkthrough ? { index: walkIndex, count: walkthrough.length, text: walkLine.text, onStep: (line, at) => { if (line >= walkthrough.length - 1) lessonTappedAt.current = at; stepWalkthrough(line, at); } } : null}/>}
          {!lesson && walkLine && walkthrough && <WalkthroughPanel title={hintDisplay?.text ?? ''} index={walkIndex} count={walkthrough.length} text={walkLine.text} onStep={stepWalkthrough} learn={walkStep && walkIndex === walkthrough.length - 1 && hasLesson(lessonOf(walkStep)) ? { name: lessonName(lessonOf(walkStep)), onOpen: at => { if (at - hintAdvancedAt.current > 350) openLesson(lessonOf(walkStep)); } } : undefined}/>}
          {lesson?.phase === 'done' && <LessonDone name={lessonName(lesson.id)} back={{ hint: 'Back to your game', list: 'Back to Learn', home: 'Back home' }[lesson.from]} onExit={exitLesson}/>}
          <div className="note-controls" aria-label="Puzzle tools" inert={Boolean(walkLine) || lesson?.phase === 'done' || Boolean(lesson?.result?.correct)}>
            <div className="mode-switch" role="group" aria-label="Entry mode">
              <span className={`mode-indicator mode-indicator-${colorMode ? 'color' : mode}`} aria-hidden="true"/>
              {(['value', 'note', 'exclude', 'color'] as const).map(option => <Pressable key={option} className={`mode-option mode-${option}`} aria-pressed={colorMode ? option === 'color' : mode === option} disabled={paused || busy} onClick={() => option === 'color' ? chooseColorMode() : chooseMode(option)} title={{ value: 'Numbers', note: 'Notes (N)', exclude: 'Exclude (X)', color: 'Color (C)' }[option]}>
                <Icon name={({ value: 'numbers', note: 'pencil', exclude: 'exclude', color: 'palette' } as const)[option]} size={16}/><span>{{ value: 'Numbers', note: 'Notes', exclude: 'Exclude', color: 'Color' }[option]}</span>
              </Pressable>)}
            </div>
            <div className="edit-actions">
              <Pressable className="history-control" disabled={!game?.history.length || paused || busy || lessonLocked} onClick={() => { doUndo(); focusSelectedCell(); }} aria-label="Undo" title="Undo (⌘Z / Ctrl+Z)"><Icon name="undo" size={19}/></Pressable>
              <Pressable className="erase-control" disabled={!canErase} onClick={() => { input(0); focusSelectedCell(); }} aria-label="Erase" title="Erase (Backspace)"><Icon name="erase" size={20}/></Pressable>
              <Pressable className="history-control" disabled={!game?.redoHistory.length || paused || busy || lessonLocked} onClick={() => { doRedo(); focusSelectedCell(); }} aria-label="Redo" title="Redo (⌘⇧Z / Ctrl+Shift+Z)"><Icon name="undo" size={19} style={{ transform: 'scaleX(-1)' }}/></Pressable>
            </div>
          </div>
        {colorMode ? <div className="number-pad color-pad" role="group" aria-label="Colors" inert={Boolean(walkLine) || lesson?.phase === 'done' || Boolean(lesson?.result?.correct)}>
          {([1, 2] as const).map(color => <Pressable key={color} className={`number-key color-key color-key-${COLOR_NAMES[color]}`} aria-label={`Color ${COLOR_NAMES[color]}`} aria-pressed={selectedColor === color} disabled={!paintable} onClick={() => paint(color)}><span className="swatch-dot"/></Pressable>)}
          <div className="color-actions">
            <Pressable className="number-key color-key" aria-label="Clear color" disabled={!paintable || !paintTargets.some(i => game?.colors[i])} onClick={() => paint(0)}><Icon name="erase" size={20}/></Pressable>
            <Pressable className="number-key color-key color-clear-all" disabled={!canPaint || !game?.colors.some(Boolean)} onClick={() => recolor(clearColors)}><span>Clear all</span></Pressable>
            <Pressable className="number-key color-key color-help" aria-label="About colors" disabled={busy || paused || Boolean(lesson)} onClick={() => openSheet('colors')}><span aria-hidden="true">?</span></Pressable>
          </div>
        </div> : <div className={`number-pad mode-${mode}`} aria-label="Number pad" inert={Boolean(walkLine) || lesson?.phase === 'done' || Boolean(lesson?.result?.correct)}>
          {DIGITS.map(n => {
            const { remaining, filtered, focusOnly } = keyState(n);
            const lit = focusedDigit === n;
            return <Pressable key={n} className={`number-key ${lit ? 'digit-focused' : ''} ${!remaining ? 'digit-finished' : ''} ${filtered ? 'digit-filtered' : ''}`} aria-pressed={numberFocus || focusOnly ? lit : undefined} aria-label={(numberFocus || focusOnly ? `Focus on ${n}` : batchSelection ? (game && batchHasMark(game, { indices: selection.indices, value: n, marks: excluding ? 'exclusions' : 'notes' }) ? `Remove ${excluding ? 'exclusion' : 'note'} ${n} from ${selection.indices.length} selected cells` : `${excluding ? 'Exclude' : 'Add note'} ${n} ${excluding ? 'from' : 'to'} ${selection.indices.length} selected cells`) : `${excluding ? 'Rule out' : 'Enter'} ${n}${pencil ? ' as a note' : ''}`) + (filtered ? ', unavailable: already in this row, column, or box' : '') + (remaining ? '' : ', all placed')} disabled={!game || busy || paused || complete} onKeyDown={event => { if (event.key === 'Enter' && event.repeat) event.preventDefault(); }} onPointerDown={event => { if (event.isPrimary && event.button === 0) startKeyHold(n, event.pointerId); }} onPointerUp={event => endKeyHold({ released: true, pointerId: event.pointerId })} onPointerLeave={event => endKeyHold({ released: false, pointerId: event.pointerId })} onPointerCancel={event => endKeyHold({ released: false, pointerId: event.pointerId })}
              onContextMenu={event => { if (pencil) event.preventDefault(); }}
              onClick={() => { if (!endsBoldHold(n)) input(n); }}><span style={{ gridRow: Math.ceil(n / 3), gridColumn: (n - 1) % 3 + 1 }}>{n}</span></Pressable>;
          })}
        </div>}
        <p className="sr-only" role="status">{boldAnnouncement.text && `${boldAnnouncement.text}${boldAnnouncement.id % 2 ? '\u00a0' : ''}`}</p>
        <p className="sr-only" role="status">{fillAnnouncement.text && `${fillAnnouncement.text}${fillAnnouncement.id % 2 ? '\u00a0' : ''}`}</p>
        <p className="sr-only" role="status">{undoAnnouncement.text && `${undoAnnouncement.text}${undoAnnouncement.id % 2 ? '\u00a0' : ''}`}</p>
        <p className="sr-only" role="status">{batchSelection ? `${selection.indices.length} ${selection.indices.length === 1 ? 'cell' : 'cells'} selected` : ''}</p>
        <p className="sr-only" role="status">{rejection ? `${rejection.value} rejected, ${rejection.kind === 'constraint' ? `already in this ${rejection.unit}` : rejection.exclusion ? `it is the answer for ${rejection.cells.length === 1 ? 'this cell' : 'a selected cell'}` : 'incorrect for this cell'}${rejection.id % 2 ? '\u00a0' : ''}` : ''}</p>
        </div>
      </>}

      {error && <div className="notice" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss message"><Icon name="close" size={16}/></button></div>}
      {storageError && <p className="storage-warning" role="status">Saving is unavailable in this browser. Keep this tab open to continue your puzzle.</p>}
      </div>
    </main>
    </>}
    </>}
  </div></ViewTransition>

    <dialog className="sheet" data-kind={sheet ?? undefined} ref={dialog} onPointerDown={sheetDrag.onPointerDown} onPointerMove={sheetDrag.onPointerMove} onPointerUp={sheetDrag.onPointerUp} onPointerCancel={sheetDrag.onPointerCancel} onClose={event => { const sheetElement = event.currentTarget; sheetDrag.reset(sheetElement); delete sheetElement.dataset.closing; sheetElement.style.translate = ''; setSheet(null); }} onCancel={event => { if (!('closing' in event.currentTarget.dataset)) { event.preventDefault(); closeSheet(); } }} onAnimationEnd={event => { if (event.target === dialog.current && 'closing' in dialog.current.dataset) dialog.current.close(); }} onClick={event => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeSheet(); } }} aria-labelledby="sheet-title">
      <div className="sheet-content"><div className="sheet-handle"/><button className="sheet-close icon-button" onClick={() => closeSheet()} aria-label="Close dialog"><Icon name="close" size={19}/></button>
        {sheet === 'new' && <><div className="sheet-symbol"><Icon name="plus" size={28}/></div><h2 id="sheet-title">A fresh puzzle</h2><p className="sheet-subtitle">Choose how much of a challenge you’d like.</p><div className="difficulty-options" role="group" aria-label="Puzzle difficulty">{LEVELS.map(level => <button key={level} className={difficulty === level ? 'chosen' : ''} aria-pressed={difficulty === level} aria-label={`${level}: ${LEVEL_NOTES[level]}`} onClick={() => setDifficulty(level)}><LevelBars level={level}/><span className="capitalize">{level}</span></button>)}</div><p className="level-note" aria-hidden="true"><span className="capitalize">{difficulty}</span> · {LEVEL_NOTES[difficulty]}</p>{regularUnfinished && regularGame && <p className="replacement-note">This will replace your <span className="capitalize">{regularGame.difficulty}</span> puzzle in progress.</p>}<button className="primary-button full-width" onClick={() => { closeSheet(); requestPuzzle(difficulty); }}>Start puzzle</button><button className="text-button full-width" onClick={() => closeSheet()}>Keep playing</button></>}
        {sheet === 'restart' && <><div className="sheet-symbol"><Icon name="restart" size={28}/></div><h2 id="sheet-title">Restart this puzzle?</h2><p className="sheet-subtitle">Start the same puzzle again with a fresh timer. Your entries, notes, exclusions, and undo history will be cleared.</p><p className="replacement-note">This cannot be undone.</p><button className="primary-button full-width" onClick={restartPuzzle}>Restart puzzle</button><button className="text-button full-width" onClick={() => closeSheet()}>Keep playing</button></>}
        {sheet === 'settings' && <><h2 id="sheet-title">Settings</h2>
          <div className="puzzle-actions">
            <button className="puzzle-action new-puzzle-action" disabled={busy} onClick={() => { setDifficulty(game?.difficulty ?? 'easy'); openSheet('new'); }}><Icon name="plus" size={23}/><span>New puzzle</span></button>
            <button className="puzzle-action" disabled={!game || busy} onClick={() => openSheet('restart')}><Icon name="restart" size={23}/><span>Restart puzzle</span></button>
            <button className="puzzle-action secondary-puzzle-action" disabled={!game || paused || busy || complete} onClick={() => { setGame(current => current ? fillNotes(current) : current); closeSheet(); }}><Icon name="fill" size={20}/><span>Fill notes</span></button>
          </div>
<div className="setting-section"><h3>Appearance</h3><div className="segmented">{(['system','light','dark'] as Theme[]).map(theme => <button key={theme} aria-pressed={preferences.theme === theme} className={preferences.theme === theme ? 'active' : ''} onClick={() => updatePreferences({ theme })}><span className="capitalize">{theme}</span></button>)}</div></div><div className="setting-row"><Icon name="shield" size={21}/><div className="setting-copy"><strong>Block incorrect answers</strong><p>Refuse wrong numbers, and crossing out right ones</p></div><button className="switch" role="switch" aria-checked={preferences.blockIncorrectAnswers} aria-label="Block incorrect answers" onClick={() => updatePreferences({ blockIncorrectAnswers: !preferences.blockIncorrectAnswers })}><span/></button></div><div className="setting-row"><Icon name="fill" size={21}/><div className="setting-copy"><strong>Highlight related cells</strong><p>Follow the row, column, and box</p></div><button className="switch" role="switch" aria-checked={preferences.highlightPeers} aria-label="Highlight related cells" onClick={() => updatePreferences({ highlightPeers: !preferences.highlightPeers })}><span/></button></div><div className="setting-row"><Icon name="sparkles" size={21}/><div className="setting-copy"><strong>Smart highlighting</strong><p>Select a filled cell to see where its number could go</p></div><button className="switch" role="switch" aria-checked={preferences.smartHighlighting} aria-label="Smart highlighting" onClick={() => updatePreferences({ smartHighlighting: !preferences.smartHighlighting })}><span/></button></div><div className="setting-row"><Icon name="filter" size={21}/><div className="setting-copy"><strong>Filter number keys</strong><p id="filter-setting-description">Dim numbers already in this row, column, or box.</p></div><button className="switch" role="switch" aria-checked={preferences.filterNumberKeys} aria-label="Filter number keys" aria-describedby="filter-setting-description" onClick={() => { setBlockedEntry(null); updatePreferences({ filterNumberKeys: !preferences.filterNumberKeys }); }}><span/></button></div><div className="setting-row"><Icon name="clock" size={21}/><div className="setting-copy"><strong>Hide timer</strong><p id="hide-timer-description">Keep tracking time without showing it.</p></div><button className="switch" role="switch" aria-checked={preferences.hideTimer} aria-label="Hide timer" aria-describedby="hide-timer-description" onClick={() => updatePreferences({ hideTimer: !preferences.hideTimer })}><span/></button></div><div className="setting-row"><Icon name="check" size={21}/><div className="setting-copy"><strong>Fill lone notes</strong><p id="lone-notes-description">Place a note when it is the only number left for its cell.</p></div><button className="switch" role="switch" aria-checked={preferences.fillLoneNotes} aria-label="Fill lone notes" aria-describedby="lone-notes-description" onClick={() => updatePreferences({ fillLoneNotes: !preferences.fillLoneNotes })}><span/></button></div>{process.env.NEXT_PUBLIC_BUILD_TARGET === 'ios' && <div className="setting-group"><div className="setting-row"><Icon name="haptics" size={21}/><div className="setting-copy"><strong>Haptics</strong></div><button className="switch" role="switch" aria-checked={preferences.haptics} aria-label="Haptics" onClick={() => updatePreferences({ haptics: !preferences.haptics })}><span/></button></div></div>}<div className="setting-group" role="group" aria-label="About"><button className="group-row" onClick={() => showSheetPage('help')}><Icon name="help" size={19}/><span>How to play</span><Icon name="chevron" size={14}/></button><button className="group-row" onClick={() => showSheetPage('privacy')}><Icon name="lock" size={19}/><span>Privacy</span><Icon name="chevron" size={14}/></button></div></>}
        {sheet === 'help' && <><div className="sheet-symbol"><Icon name="help" size={28}/></div><h2 id="sheet-title">Nine numbers. One rule.</h2><p className="sheet-subtitle">Fill every row, column, and 3 × 3 box with the numbers 1–9, using each number just once.</p><div className="help-row"><Icon name="pencil"/><div><h3>Room for a possibility</h3><p>Drag from an empty cell to select cells immediately, or hold an empty cell to begin. Drag across other empty cells, or tap them to add or remove them from your selection. A selection uses Notes, or Exclude when Exclude is chosen. Tap a number to apply it to every selected cell; the selection stays, so you can tap more numbers. A new drag starts a new selection in the same mode. When the selection ends you stay in Notes or Exclude, or return to Numbers if you started there. Choosing Numbers cancels the selection. If every selected cell already has that note or exclusion, tapping the number removes it from all of them. Tap a filled cell or press Escape to finish selecting. These actions leave your notes unchanged. For repeated note entry in one cell, choose Notes. In Notes, hold a number to bold that note, and hold it again to make it plain. Entering a number clears that note from related cells.</p></div></div><div className="help-row"><Icon name="bulb"/><div><h3>Stuck? Ask for a hint</h3><p>Tap the bulb for a hint. Each tap shows a little more: the technique, where to look, then a step-by-step walkthrough of why the move works. Apply makes the move for you.</p></div></div><div className="help-row"><Icon name="learn"/><div><h3>Learn every technique</h3><p>All techniques on Home opens a lesson for each one: watch it on a real board, then find it yourself on practice boards.</p></div></div><div className="help-row"><Icon name="undo"/><div><h3>Try things out</h3><p>Undo, beside Erase, takes back your last change, including notes. Redo restores an undone change. Both survive reopening; a new edit clears Redo. Erase clears your number or annotations from the selected cell, and dims when there is nothing to erase. The darker starting numbers stay in place.</p></div></div><div className="help-row"><Icon name="help"/><div><h3>Smart highlighting</h3><p>Enable Smart highlighting in Settings, then select a filled cell. Green cells show where its number is allowed by the current row, column, and box, excluding digits you have ruled out. Cells where you ruled it out turn faded red. These are possible placements, not guaranteed answers. The highlights follow the focused number.</p></div></div><div className="help-row"><Icon name="help"/><div><h3>Keep a number in focus</h3><p>Select a filled cell or enter a number to focus that number. Its key turns blue, its placed numbers are ringed, and its notes are marked. Focus stays while you select empty cells or add notes and exclusions. With Smart highlighting enabled, possible cells stay green too. With a filled cell selected, tap a number in the number pad to focus it, or tap the blue key to stop focusing. Focus resets for a new puzzle or when you reopen the app.</p></div></div><div className="help-row"><Icon name="pencil"/><div><h3>Fill notes when you want</h3><p>Fill notes in Settings replaces notes in every empty cell with all possibilities allowed by placed numbers. Your crossed-out exclusions stay in place and are left out of the generated notes. Generated notes are blue; notes you edit use the normal text color. Undo restores the previous notes. Entering a number clears matching notes and exclusions from related cells. With Fill lone notes on, a cell whose one note is the only number left fills itself.</p></div></div><div className="help-row"><Icon name="pencil"/><div><h3>Record what you rule out</h3><p>Choose Exclude and tap a number to cross it out in a cell. Tap again to clear it. Exclusions also remove that cell from Smart highlighting for that number. They never trigger deductions in other cells.</p></div></div><div className="help-row"><Icon name="filter"/><div><h3>Filter number keys</h3><p>Enable Filter number keys in Settings to dim numbers already in the selected cell’s row, column, or box, in every mode. Tapping or typing a dimmed number, or one with all nine placed, focuses that number instead of entering it. Tap it again to stop focusing. Available numbers are possibilities; Block incorrect answers checks them against the solution separately.</p></div></div><div className="keyboard-help"><h3>Using a keyboard?</h3><p><kbd>↑ ↓ ← →</kbd> Move between cells</p><p><kbd>1–9</kbd> Enter a number <kbd>N</kbd> Notes</p><p>In Notes, <kbd>Shift 1–9</kbd> Bold a note</p><p><kbd>X</kbd> Exclude <kbd>C</kbd> Color. Press the same key again for Numbers.</p><p>In Color, <kbd>1</kbd> Gold <kbd>2</kbd> Blue <kbd>⌫</kbd> Clear</p><p><kbd>H</kbd> Hint <kbd>Esc</kbd> Close hint</p><p><kbd>⌫</kbd> Erase <kbd>⌘ / Ctrl Z</kbd> Undo</p><p><kbd>⌘ / Ctrl Shift Z</kbd> Redo</p></div><button className="primary-button full-width" onClick={() => closeSheet()}>Got it</button></>}
        {sheet === 'colors' && <><div className="sheet-symbol"><Icon name="palette" size={28}/></div><h2 id="sheet-title">Colors</h2><p className="sheet-subtitle">Color cells gold or blue to follow one digit. When a row, column, or box has only two places for it, one of them holds it, so give them opposite colors. Keep going, and the chain shows which color is right or which other cells can’t hold the digit.</p><div className="setting-group" role="group" aria-label="Coloring lessons">{(['color-wrap', 'color-trap'] as const).map(id => <button key={id} className="group-row" onClick={() => { closeSheet(); openLesson(id); }}><Icon name="learn" size={19}/><span>{lessonName(id)}</span><Icon name="chevron" size={14}/></button>)}</div><button className="primary-button full-width colors-done" onClick={() => closeSheet()}>Got it</button></>}
        {sheet === 'privacy' && <><div className="sheet-symbol"><Icon name="lock" size={28}/></div><h2 id="sheet-title">Privacy</h2><PrivacyPolicy/></>}
        {sheet === 'install' && <><AppMark/><h2 id="sheet-title">A place on your Home Screen</h2><p className="sheet-subtitle">Open straight into Sudoclue, with more space to play. Once ready, Sudoclue works offline too.</p>{installed ? <p className="install-instructions">Sudoclue is already installed.</p> : installEvent ? <button className="primary-button full-width" onClick={async () => { try { await installEvent.prompt(); const choice = await installEvent.userChoice; if (choice.outcome === 'accepted') closeSheet(); setInstallEvent(null); } catch { setInstallEvent(null); } }}>Install Sudoclue</button> : <div className="install-instructions"><h3>On iPhone or iPad</h3><p>Open in Safari, tap the Share button, then choose <strong>Add to Home Screen</strong>.</p><h3>On Android or desktop</h3><p>Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>, when available.</p></div>}<p className="privacy-note">{offlineReady ? 'Your app is ready for offline play.' : 'Connect to the internet for the first visit. Offline play becomes available after the app finishes downloading.'}</p><button className="text-button full-width" onClick={() => closeSheet()}>Done</button></>}
      </div>
    </dialog>
  </>;
}
