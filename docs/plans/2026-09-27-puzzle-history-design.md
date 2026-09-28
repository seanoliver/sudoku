# Puzzle history

Players can see the puzzles they've finished (R10). The solved chip on Home opens History, and Home is one tap back.

## Direction

Sean was shown three renders (stats, gallery, calendar) and asked for calendar and stats combined: the streak and month calendar first, then the level stats, then recent solves.

## History

- **Streak:** "N days in a row" when there are solves on two or more consecutive days, ending today, or ending yesterday while today has none yet.
- **Calendar:** the current month, with a colored square for each solve that day (up to four), in the level's color. Earlier months page back; the calendar stops at the current month. Tapping a day with solves shows only that day's solves below. Tapping it again shows all of them.
- **Levels:** a tile for each difficulty with its count and best time.
- **Recent:** newest first, 30 at a time. Each row has the starting board as a pattern of filled squares (one per starting number), the difficulty, the date, and the time.
- **Earlier solves:** solves from before History existed have no details. They show as "+N earlier" under the list, and still count in the total.

## Data

- `sudoku.solves.v1` holds each solve's game id, difficulty, seconds, local date, and starting board, newest first, capped at 500.
- A solve is recorded when a game in play is finished. Lesson boards and reopened finished games are not recorded. Solving a restarted game again keeps the first record.
- The time comes from the clock's saved seconds, which the clock writes when it stops at completion.

## Tests

- **Unit:** reading and validating records, recording once with the cap, level stats, the streak, the month grid, and local day keys.
- **Browser:** a finished puzzle appears in History and focus returns to the chip; the streak, counts, best times, and earlier solves; filtering by day; paging months; Escape returns Home.
