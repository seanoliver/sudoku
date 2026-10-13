# Daily puzzle: implementation plan

Design: [2026-10-12-daily-puzzle-design.md](2026-10-12-daily-puzzle-design.md). One PR, eight steps, tests passing after each.

## Data (`src/lib/daily.ts`, no React)

- Day: the local date, `dayKey(new Date())`. Id: `daily-<day>-<level>`. Seed: FNV-1a of `<day>:<level>`. Expert dailies pass an empty `avoid`, so everyone at a level gets the same puzzle.
- `sudoku.daily.v1`: `{ level, day, games: { [level]: GameState } }`. Holds only today's games; read on a new day, `games` is dropped, so a missed daily disappears. Also caches the untouched puzzle once built, so Home shows it at once and offline. `level` is the daily level last chosen; it starts at the current game's level, then the newest solve's, then Easy.
- `sudoku.daily-solves.v1`: `{ solved: [{ day, level, seconds }] }`, uncapped (a few KB a year). The daily streak and month read it.
- Clock: `clockKey(id)` is `CLOCK_KEY` for regular games and `sudoku.daily-clock.v1.<level>` for dailies.
- A solved daily also counts as a regular solve (History, solved count, replay). An Expert daily records its bank puzzle as seen without starting a new cycle.
- Midnight: an open daily keeps going and counts for the day in its id. Home re-reads the date at midnight plus 50 ms, as History does.
- Building a puzzle takes up to about 200 ms (Hard), so dailies are built in the worker.

## Game screen (`game.tsx`)

- The open game is saved by its id: a daily to the daily slot, a regular game to `SAVE_KEY`. Switching loads the other from storage.
- `startGame(next)` holds the per-game reset now inside `requestPuzzle`'s worker reply.
- The worker takes a `seed` and a `tag` and echoes the tag; a build for Home never takes over the screen.
- `Clock` takes a `storageKey`; the four `CLOCK_KEY` reads use `clockKey(id)`.
- A solved daily is also written to `daily-solves`.
- Home data reads the regular game and the daily separately, each with its own time.
- The New puzzle sheet warns about replacing a game only when an unfinished regular game is stored. Starting one from a daily leaves the daily saved.
- In a daily, the level control in the bar is a plain "Daily · Medium" label.

## Home and month

- `DailyHero` in `home.tsx` from the prototype: title (ready, waiting, solved), date and streak, board, the week row as one button with a chevron, the level chip, and Play, "Continue · mm:ss", or a check with "Next in Xh Ym".
- A Continue row for an unfinished regular game. Home's "Nicely solved" hero goes; a finished game is in History.
- The level chip opens a `daily-level` sheet using the difficulty options.
- Month: `MonthCalendar` is pulled out of `history-page.tsx`, and a small `DailyPage` pushes like History (screen, swipe back, Escape, focus back to the week row).
- `ViewTransition name="board"` sits on whichever board opens, never both.

## Steps

1. `daily.ts` and `tests/daily.test.ts`.
2. Worker seed and tag; `Clock` `storageKey`; `clockKey`.
3. `game.tsx`: `startGame`, save routing, daily solves, Home data. `e2e/daily.spec.ts`: playing the daily leaves the regular game unchanged; two games keep two clocks.
4. Home hero, Continue row, countdown, CSS. e2e with `page.clock.install` for all six approved panels; update `home.spec.ts`.
5. Level sheet: a new level changes the board; solving any level marks the day.
6. `MonthCalendar` and `DailyPage` with navigation; `history.spec.ts` still passes.
7. Midnight: solved becomes ready again; a solve after midnight counts for the day before.
8. Docs: README, ROADMAP, AGENTS.md (syncing-docs).
