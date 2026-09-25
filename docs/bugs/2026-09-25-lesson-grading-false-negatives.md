# Lesson grading rejected correct moves

## Symptom

- In the naked-single lesson, placing the right digit on practice boards 1, 2, 3, or 5 showed "Not quite", so the lesson could never be finished.
- In the naked-pair lesson, crossing a pair's digits out of both houses it shares (a row and a box) was also graded wrong.

## Root cause

- Grading treated any removed crossing-out as "not the move". Placing a digit clears that cell's crossings-out and the digit's crossings-out in its peers, and lesson boards carry the solver's earlier crossings-out, so a correct placement always looked like an extra change.
- Elimination grading required an exact match with one instance, but a naked pair yields one instance per house it sits in. Crossing out both houses matched neither.

## Reproduction

1. Open the naked-single lesson and start practice.
2. On board 1, place the digit in cell 20 (row 3, column 3), which has 3 crossed out.
3. Tap Check.

## Fix

- A placement is compared with the board `enter` produces for that placement, crossings-out included.
- Crossings-out are right when they complete one instance and stay within the eliminations of the instances that share its pattern and digits.

## Verification

A unit test plays every correct instance on every lesson board through `enter`, the same path as the UI, and requires each to grade right. It failed on four naked-single boards before the fix and passes after. A second test covers the two-house naked pair. A new browser test runs a placement lesson in Chromium and WebKit.

## Recurrence guardrail

Grading tests make moves through the game's own functions (`enter`, `excludeCandidates`), never by constructing the expected board, and they cover every board in the lesson bank, so the bank's data can't hide a case.
