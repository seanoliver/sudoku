# Home screen

The app opened straight into a game, and Learn sat behind a small book button. A home screen makes continuing, starting, and learning the three front doors, with room for history and achievements later (R11).

## Direction

Sean chose A from three renders (continue first, two tiles, menu), after seeing its first-visit and just-finished states. The app opens on Home every time.

## Home

- **Game in progress:** a card with a mini board, difficulty, percent filled, time, and a Continue button. Below it, four difficulty buttons start a new puzzle. They open the existing new-puzzle sheet, preset to that difficulty, because it already warns that the current puzzle will be replaced.
- **First visit** (no saved game): "Pick your first puzzle", with the four difficulties and their notes as the main card. The app no longer generates a puzzle before the player asks for one.
- **Just finished:** a small Solved card (board and time), then "Play another" with the four difficulties.
- **Learn:** a card for the next unlearned lesson, easiest first ("Start with" when none are learned). Tapping it opens that lesson, which returns to Home. "All techniques" opens the Learn page, which also returns to Home.
- A solved count sits at the bottom once there is one. Settings opens the existing settings sheet.

## Game screen

- A home button replaces the book button in the top bar. Home pauses nothing explicitly: the clock stops because it isn't on screen, and resumes on Continue.
- Lessons opened from a hint still return to the game.

## Tests

- **Unit:** home state (new, playing, done), percent filled, next lesson, and reading the saved time.
- **Browser:** every state of Home; continue and return with the game unchanged; start a first puzzle; a new puzzle from Home replaces the game only after the sheet's confirmation; the next lesson and All techniques both return to Home. Existing browser tests enter the game through Continue.
