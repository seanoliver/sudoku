# Home screen

The app opened straight into a game, and Learn sat behind a small book button. A home screen makes continuing, starting, and learning the three front doors, with room for history and achievements later (R11).

## Direction

Sean first chose A (continue first), then judged the built version too utilitarian for the first screen. From a second round (D greeting, E stage, F journey) he chose D: a warm greeting, the board as the hero, and color-coded levels. The app opens on Home every time.

## Home

- **Greeting:** "Good morning", "Good afternoon", "Good evening", or "Up late", from the hour when Home is shown.
- **Game in progress:** "Your expert puzzle is right where you left it". The board floats, slightly tilted, in a hero card with percent filled and time; the whole card is the Continue button.
- **First visit** (no saved game): "Ready for your first puzzle?" over a decorative sample board. The app no longer generates a puzzle before the player asks for one.
- **Just finished:** "Nicely solved. Up for another?" over the solved board, marked Solved, with its time.
- **Levels:** four color tiles (easy green, medium blue, hard amber, expert purple). Each has a small 3×3 that fills in more as the level gets harder. They open the existing new-puzzle sheet when a game is in progress, since it warns before replacing it.
- **Chips:** the solved count (once there is one) and techniques learned. The techniques chip opens the Learn page.
- **Learn:** a card for the next unlearned lesson, easiest first. It opens that lesson, which returns to Home.
- Hide timer also hides the time on Home.

## Game screen

- A home button replaces the book button in the top bar. Home pauses nothing explicitly: the clock stops because it isn't on screen, and resumes on Continue.
- Lessons opened from a hint still return to the game.

## Tests

- **Unit:** home state (new, playing, done), percent filled, next lesson, the saved time, the solved list, and the greeting.
- **Browser:** every state of Home; continue and return with the game unchanged; start a first puzzle; a new puzzle from Home replaces the game only after the sheet's confirmation; the next lesson and All techniques both return to Home. Existing browser tests enter the game through Continue.
