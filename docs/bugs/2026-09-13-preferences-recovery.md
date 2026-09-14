# Preserve game progress when preferences are damaged

## Symptom

Code review found that invalid JSON in the preferences key could replace a valid saved puzzle with a fresh easy puzzle on reload.

## Root cause

Game restoration and preferences parsing shared one try/catch. A preferences parse error entered the fallback for failed game restoration. Separately, clock restoration rounded fractions down on every pause or modal transition.

## Reproduction

With a valid game at `sudoku.game.v1`, store `{` at `sudoku.preferences.v1` and reload. The original implementation called the new-puzzle worker after restoring the game, overwriting it when the worker returned. Clock issue: repeatedly toggle pause or open a sheet midway through a second.

## Fix

Preferences have an independent, validated parser and an independent storage-read boundary. Invalid settings fall back to defaults without affecting gameplay. Clock keeps fractional elapsed time internally and rounds only its display.

## Verification

Regression test first reproduced the preferences SyntaxError, then passed for malformed JSON, null, incorrect shapes, wrong themes, and valid false settings. All ten engine/state/preferences tests pass. TypeScript, ESLint, and production build are checked as part of final verification.

## Recurrence guardrail

Treat optional preferences as a separate recovery domain from valuable saved progress. Never let a settings error invoke game creation. Keep clock precision separate from its presentation.
