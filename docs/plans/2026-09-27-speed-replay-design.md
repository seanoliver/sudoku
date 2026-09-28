# Speed replay

Roadmap item: speed replay after completion. On September 27 Sean chose C, a replay page, from three directions rendered in the app (on the board, looping card, replay page), then C1, hero recap, from three restyles in the Home look (hero recap, chips and timeline, stage). Reference: ../designs/replay-approved.png, ../designs/replay-approved-dark.png, and ../designs/replay-approved.webm.

## Replay page

- **Header:** Done on the left returns to where the replay was opened. Escape and the browser's Back do the same; the replay has its own history entry.
- **Headline:** "Replay" in blue, then "Your expert solve", then the level tiles and the solve time. Hide timer hides the time.
- **Board:** read-only, in a glowing hero card like Home's. The cell whose number changed on the current step is outlined (for a notes-only step, the cells it touched); a number that doesn't match the solution shows in red with a dot until it is fixed.
- **Play pill:** a gradient pill on the card's bottom edge toggles Play and Pause. Finishing the replay leaves the last board showing, and Play starts over.
- **Stat tiles:** numbers placed (blue), note changes (amber), and fixes (red).
- **Timeline card:** a tick per step (numbers tall, notes short, fixes red and tallest), a scrubber, "33 of 69", and 1×, 2×, 4× speed. Moving the scrubber pauses.
- **Keyboard and assistive tech:** Space plays and pauses, the arrow keys step, the scrubber announces "Step 33 of 69".

## Where it opens

- A Replay button on the completion card.
- A Replay pill on Home's "Nicely solved" card, in the same place as Continue.
- Only when a recording exists for that game. History rows are a follow-up.

## Recording

- Every change to the board while playing is recorded as the cells it changed: value, notes, and exclusions. That covers entries, erases, notes, exclusions, batches, Fill notes, undo, redo, and applied hints.
- Recordings are kept for the 20 most recent games in `sudoku.replays.v1`, within 1 MB so they can't crowd out the game's save; the oldest games are dropped first, and the newest is always kept.
- Past 2,000 steps, new changes fold into the last step, so the replay still ends on the final board.
- Restarting a puzzle starts a new recording. Lesson boards are never recorded.
- A game already in progress before this release is recorded from the board it had when recording began, and its replay starts there.
- Playback plays one step every 180ms at 1×, so long pauses are compressed.

## Tests

- **Unit:** diffing two boards into a step, applying steps to rebuild every board, classifying steps (number, note, fix), stats, the 20-game and 2,000-step caps, and reading stored recordings.
- **Browser:** a solve replays from the givens to the finished board; the stats count numbers, notes, and a fix; the scrubber, speed, and Space work; Done and Escape return; Home's Replay pill; no Replay without a recording; Restart starts a new recording.
