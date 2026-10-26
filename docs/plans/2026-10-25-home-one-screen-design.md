# Home on one screen

Roadmap item: R24, Home on one screen. On October 25 Sean chose direction A1, picker in the bar, from two rounds rendered in the app. Round 1 offered a tight stack (A), a tile grid (B), and the game screen's frame (C); Sean liked A but found its level keys and its two Learn buttons wasteful, and asked for no logo in the bar and one level picker for the daily and a new puzzle. Round 2 placed that picker in the bar (A1), on the daily card (A2), or beside New puzzle (A3). Reference: ../designs/home-one-screen-approved.png, ../designs/home-one-screen-approved-dark.png, and ../designs/home-one-screen-approved-picker.png.

## Layout

- Home fills the screen and never scrolls, on every phone. Before this change it was 1109 px tall on an 844 px phone in a typical state.
- The bar has no name or mark. On the left, the level picker; on the right, four icon buttons: Learn, History (shown once there is a solve), Install (website only, until installed), and Settings. Their accessible names carry the counts.
- The bar holds no count text, so no font, text size, or count can make it wider than the screen. On narrow bars the level name shortens with an ellipsis, and on the narrowest only the level tiles show. Sean chose this on October 25, after review found the A1 counts overflowing with large text.
- The daily card: the date and streak, today's board, the week (opens the month), and one full-width Play, Continue with the time, or the time until the next one.
- The board takes the height the other rows leave, as the game board does, up to the card's width.
- Under the daily, one grouped card: Your puzzle (an unfinished regular game, with percent and time), New puzzle at the picked level, and Learn next with techniques learned (5/14), or Revisit a lesson once all are learned.
- The greeting, the "Today's puzzle is ready" title, the four level rows, the solved and techniques chips, and the install card are gone. Their jobs moved to the bar and the grouped card.

## The level picker

- One level for the whole screen. It picks which daily the card shows and plays, and the level New puzzle starts.
- It is the daily level the app already keeps (`sudoku.daily.v1`), so no new storage. The daily level sheet goes away.
- Tap opens a menu under it with the four levels, each with its tiles and its note ("Warm up"), and a check on the current one. Picking closes it. Escape, a tap outside, or the picker again also close it.
- Picking a level only changes the level. It never starts or replaces a game. New puzzle with a regular game unfinished still asks first.

## Rejected

- **A, tight stack:** four level keys and separate techniques and solved keys took three rows for what one picker and two bar icons do.
- **B, tile grid:** the most borders and shadows; small tiles were cramped at 375 px.
- **C, game frame:** the Play pill covered the board's bottom row, and the level notes and lesson diagram were lost.
- **A2, picker on the daily card:** it read as the daily's level only.
- **A3, picker beside New puzzle:** it read as the one-off game's level only, and the half tiles dropped the regular game's percent and time.
