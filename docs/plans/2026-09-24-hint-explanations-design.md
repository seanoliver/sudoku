# Hint explanations design

A hint shows the move but not why it is valid. On a coloring step the strip said "Cross out the 2s" with no reasoning, so the player learns nothing. Hints should teach each deduction well enough that the player stops needing them.

## Direction

Sean chose direction A from three renders (panel under the board, callout on the board, sheet), then revised it over three rounds. The renders live outside the repo; the prototype is on `feat/hint-why`, behind `?why=a`.

- **Walkthrough panel.** At the move level, the keypad area becomes a "Why this works" panel. The player steps through it with ‹ ›. Each step is one sentence, and the board shows exactly the evidence that sentence names. The board never moves and nothing covers it.
- **Strip.** The strip shows the deduction's name for the whole walkthrough ("Color wrap"), so the player ties the name to the reasoning. The level dots are gone. Apply appears in the strip only on the last step; before that, ‹ › are the only controls.
- **Full length.** A long chain gets every step (a color wrap took 10). Skipping links loses the player.

## Board treatment during a walkthrough

- Only the digit being explained is drawn, as a chip in front of any lines, with its own background. Other notes are dimmed.
- Colored cells use fill only: gold and blue. No pattern outlines.
- Selection, peer, matching, and possible-placement highlights are hidden.
- The house a step names is shaded gray. Cells the step is about get a dark ring. A cell that loses the digit gets a red ring.
- Links are lines between the digit chips. The newest link is darker and thicker.
- On the last step the eliminated chips turn red with a strike.

## Coloring

Coloring splits into two named deductions, following HoDoKu and Sudopedia: **Color wrap** and **Color trap**. They are separate skills in the Learn module (milestone 8). The engine reports them as `variant: 'wrap' | 'trap'`.

Both walkthroughs build the chain one link at a time from the conflict's first cell:

1. "Look only at the 2s. Row 1 has just two places for 2, so one is a 2 and the other isn't. Color them gold and blue."
2. One step per further link: "Column 3 also has just two places for 2. One is blue, so the other is gold."
3. "Every link flips the color, so either all the gold cells are 2s or none of them are."

Then:

- **Wrap:** "Column 2 has two gold cells, but it can hold only one 2. So none of the gold cells are 2s." When that house has more than two places for the digit, add "(With 4 places for 2, it was never a link.)" Last step: "Cross 2 out of every gold cell. That makes every blue cell a 2."
- **Trap:** "This cell sees a gold cell and a blue cell. One of them is a 4 either way, so this cell can't be." Last step: cross it out.

## Other techniques

Each gets a walkthrough in the same format. Most take one to three steps. The engine must report the evidence each one needs:

| Deduction | Evidence to report | Walkthrough |
| --- | --- | --- |
| Naked single | placed peers per other digit (reported) | the other digits are already in its row, column, or box |
| Hidden single | blockers per other cell (reported) | every other cell in the house is blocked |
| Pointing / claiming | the box and the line (reported) | the digit fits only on this line in this box, so it leaves the rest of the line (or box) |
| Naked / hidden set | the house and digits (reported) | these N cells hold only these N digits (or these N digits fit only in these N cells) |
| X-wing / swordfish | base lines and cover lines (not reported) | each base line has the digit only in these columns, so the columns lose it elsewhere |
| XY-wing | pivot, wings, and which digit is shared (roles lost when digits are sorted) | whichever the pivot is, one wing holds the digit |
| Color wrap / trap | conflict cells or trapped cell (now derived in `explain.ts`) | as above |

## Levels

Level 1 names the deduction and level 2 shows where to look, as today. Next on level 2 opens the walkthrough. A player who only wants a nudge can stop before the reasoning.

## Accessibility

Each step's sentence is announced through the existing status region. Gold and blue differ in more than color: each step's sentence names the color, and the rings mark the cells in question.

## Out of scope

- The Learn module's lessons and practice boards (milestone 8). Its per-technique explanations can reuse this format.
- Animated link drawing. The step-by-step reveal carries the order for now.
