# Walkthrough answer digit off center

## Symptom

On the last step of a naked or hidden single walkthrough, the answer digit sat right of and below where placed numbers sit in their cells, with the cell's dimmed notes showing behind it. It was most visible on iPhone.

## Root cause

The answer was SVG text on the board overlay. That layer maps the board to exact ninths and centers text by its baseline (`dominant-baseline: central`). Real cells aren't exact ninths because box borders are thicker, and baseline centering differs from the CSS grid centering that placed numbers use.

## Reproduction

1. Open a hint on a board whose next move is a naked single.
2. Step the walkthrough to its last line.
3. Compare the answer with the placed number in the cell above.

## Fix

The answer is now a span inside its cell, centered with the same grid and font size as placed numbers (including the 23px size at 360px and below). The cell's notes are hidden while it shows the answer.

## Verification

`e2e/hint-walkthrough.spec.ts` measures the answer glyph's offset from its cell center against a placed number's offset. It failed before the fix and passes after, in Chromium and WebKit. A 3× WebKit capture shows the 8 aligned with the 2 above it.

## Recurrence guardrail

Anything drawn to look like cell content goes inside the cell and uses the cell's own layout. The SVG overlay is only for marks that span cells or sit on note positions: links and candidate chips.
