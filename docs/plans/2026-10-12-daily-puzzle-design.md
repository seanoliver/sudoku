# Daily puzzle

Roadmap item: R15, daily puzzle. On October 12 Sean asked for a daily Sudoku that unlocks each day at the player's level, to give a sense of progress and a reason to come back. He chose direction A, Daily hero, from three options rendered in the app (Daily hero, a Home row that opens a Daily screen, Calendar home), with the week row opening a month view. For an unfinished regular game he chose variant 1, a Continue row under the hero, from three (Continue row, two-up pager, hero yields). Reference: ../designs/daily-puzzle-approved.png (first day, a 6-day streak, solved, then with an unfinished game, unsolved and solved, and the daily itself in progress), with dark mode in ../designs/daily-puzzle-approved-dark.png. All options: ../designs/daily-puzzle-options.png and ../designs/daily-puzzle-resume-options.png.

## Scope

- One daily puzzle per level per day, generated on the device from the date, so it is the same for everyone at that level and works offline.
- Today only: a missed day stays missed.
- Changing the level shows that level's daily for today. Solving any one counts for the day.

## Home

- The daily is Home's hero: the date, the streak, today's board, the week row (one circle per day, checked when solved, today ringed), the level chip, and Play.
- The week row is one button with a chevron; it opens the month view.
- Solved: the board shows a check, the title reads "Today's puzzle is solved", and Play becomes a countdown to the next daily.
- The daily in progress: Play becomes Continue with the elapsed time.
- An unfinished regular game shows as a Continue row under the hero: a mini-board, its level, how full it is, and its time.

## State

- The daily has its own save slot, so starting it never replaces a regular game in progress.
- A daily streak counts consecutive days with a daily solved, separate from History's solve streak.

## Open for the plan

- Expert dailies come from the Expert bank, so a daily can repeat a bank puzzle the player has solved.
- Where the month view lives: History, or a small Daily screen.
