# Rejected-entry feedback

Roadmap item: "More obvious incorrect-entry feedback" (September 21 playtest). Sean approved this design on September 23.

## Problem

When the game rejects an entry, the only feedback is a line of hint text under the keypad ("5 is incorrect for this cell. Answer blocked."). Players miss it, and it relies on text where a visual cue would do (see the UI design principle in `AGENTS.md`).

## Scope

- Feedback applies only to **rejected attempts**: value entry into an empty, editable cell that Block incorrect answers or Filter number keys refuses.
- With Block incorrect answers off, wrong entries are accepted and stay unmarked. Sean chose to keep that behavior.
- Filter number keys disables unavailable keypad buttons, so on touch devices only Block incorrect answers can reject. Filter rejections come from physical keyboard input.
- Notes and exclusions are never rejected. Number input on a filled cell focuses that digit (#17) and is unaffected.

## Behavior

- The rejected digit appears in the cell in red with a strike-through. The cell shakes horizontally for about 250ms, and the digit fades out, removed after 0.8s.
- Game state, undo history, notes and exclusions do not change. Existing notes in the cell are hidden while the digit is shown.
- Filter rejection: the peer cell or cells already holding the digit pulse with a red outline for the same duration, showing why.
- Block rejection: ghost digit and shake only. The check uses the solution, so no cell on the board explains it.
- Repeating a rejected entry during the animation restarts it. Selecting another cell, undo, redo, pause, restart, a new puzzle, or opening a sheet clears it immediately.
- The two "blocked" hint messages are removed from the visible hint line. A visually hidden live region announces "5 rejected, already in this column" or "5 rejected, incorrect for this cell".
- Reduced motion: no shake, fade or pulse. The red struck digit and source outline appear statically and are removed on the same 0.8s timer.

## Implementation

- Add a pure helper in `src/lib`: `rejectEntry(game, { index, value, filterNumberKeys, blockIncorrectAnswers })` returns `null` or `{ kind: 'constraint' | 'answer', sources: number[], unit?: 'row' | 'column' | 'box' }`. `input()` in `game.tsx` uses it in place of its two inline checks, keeping the existing precedence (constraint before answer).
- Extend the `blockedEntry` state with `sources` and an incrementing `id`. The id keys the animated elements so a repeat restarts the animation.
- Render a `.rejected-digit` span in the cell, a `rejecting` class on the cell and `rejection-source` on source cells. Keyframes live in `globals.css`, reusing `--red` and `--red-soft`.

## Verification

- Unit tests for `rejectEntry`: each kind, both settings off, givens, filled cells, note and exclude modes, the correct digit, erase (value 0), and the source/unit calculation.
- Playwright at 390 × 844 in light and dark themes and with reduced motion: keypad rejection, keyboard filter rejection with source pulse, repeat, and clearing on selection change. Save screenshots in `docs/screenshots/`.

## Out of scope

- Marking wrong entries when blocking is off.
- Auditing other hint-line text against the visual-first principle. That is a separate task.
