# Learning and automation follow-up

Deferred at Sean's request until the current deductions work is finished.

## Product direction

Let players automate deductions they already know so they can solve faster while continuing to practice techniques they are still learning. Sean sees this control as a potential defining feature of the app.

## Current behavior

- Auto notes and Smart highlighting already have independent display toggles.
- Both use one candidate calculation with independently enabled Pointing pairs, Hidden pairs, and Hidden singles.
- Manual notes remain separate from automatically derived candidates.
- The current work is in PR #3: https://github.com/seanoliver/sudoku/pull/3.

## Follow-up questions

- Prioritize gameplay impact: a 100-puzzle Hard sample reduced 86 puzzles completely with all rules enabled. See `docs/investigations/2026-09-14-deduction-gameplay-impact.md`.
- Compare unrestricted chaining, deductions based on the state before each move, and player-triggered deduction steps. How much reasoning should remain before the next placement?
- How should difficulty account for required techniques and enabled assistance, beyond starting clue count?
- Does a normal play session produce enough visible note changes for the animation to be useful?

- How should Settings distinguish deduction choices from note and highlight display options?
- Should the enabled techniques stay shared across both displays, or should each display eventually have its own choices?
- Which Auto notes display policies should be configurable beyond one or two placements per box?
- Should deductions record their reasons to support an Explain this interaction?
- How should the app explain that an enabled technique can reach the same conclusion as a disabled technique?
- How can tests cover rule interactions and display combinations without duplicating every combination in browser tests?

## Scope

This is a saved product and architecture discussion. It adds no requirements to the current three-deduction PR and authorizes no further implementation.
