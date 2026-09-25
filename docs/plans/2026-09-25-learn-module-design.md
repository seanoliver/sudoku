# Learn module, first slice

Hints now explain each deduction, but a player only sees a technique when a game happens to need it. Lessons let them learn one on purpose: watch it, then find it themselves on practice boards until it sticks. This is the first slice of roadmap milestone 8.

## Direction

Sean chose layout A from three renders (full-screen lesson, sheet over the game, in place): a lesson is its own screen, with "‹ Your game" top left, the technique name and progress dots in the center, and a full-width Check button under the keypad.

## Flow

- **Entry.** On the last step of a hint walkthrough, a "Learn {technique}" link sits under the explanation. It opens that technique's lesson.
- **Your game waits.** The game is set aside untouched: its timer pauses and the lesson never writes to its save. "‹ Your game" returns to it exactly as it was.
- **Watch.** The lesson opens on an example board with the walkthrough, stepped with ‹ ›.
- **Practice.** Five boards with every candidate noted, and a prompt such as "Find the pointing pair". The player makes the move with the normal controls (Numbers for a placement, Exclude for eliminations) and taps Check. Check is disabled until the board changes.
  - Right: the prompt turns green and the button becomes "Next board".
  - Wrong: the prompt says "Not quite", the walkthrough of the correct move replaces the keypad, and "Try again" resets the board.
- **Done.** "{Technique} learned" with a way back to the game. Learned status is saved on the device.

## Lessons

Fifteen, matching the names hints use: naked single, hidden single, pointing, claiming, naked pair / triple / quad, hidden pair / triple / quad, X-wing, swordfish, XY-wing, color wrap, color trap. Rare ones (quads) may have fewer than five practice boards.

## Grading

- A placement is right when the digit is the cell's answer and the lesson's technique produces that placement on the board.
- An elimination is right when the candidates the player crossed out exactly match the eliminations of one instance of the technique on the board.
- Any instance of the technique counts, so the engine lists every instance, not only the first.
- Any other change (a number entered during an elimination lesson, extra crossings-out) is not the move.

## Practice boards

A build script generates `src/lib/lesson-bank.ts`, like the Expert bank. Each entry is a board (values plus the exclusions made so far) where the lesson's technique is the easiest next move. A unit test re-checks every entry with the solver. One entry per lesson is the example board.

## Out of scope

- The technique list and the home screen (R11), achievements, and entry from anywhere but a hint.
- Timed or scored practice.
