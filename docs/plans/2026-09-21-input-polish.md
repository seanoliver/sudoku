# Input Polish Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Implement approved Settings B with gear and gameplay icons, restart, one title and immediate dragging.
**Architecture:** Reuse the existing modal and selection hook. Add a pure restart transition; reset the existing clock through an explicit revision prop so effect cleanup cannot overwrite the reset. No save format migration.
**Tech Stack:** React, Next.js, TypeScript, CSS, Node tests and Playwright MCP.

1. Verify baseline tests; reproduce pre-hold drag cancellation in the browser and missing Restart action.
2. Add tests/restart.test.ts for same-puzzle reset, cleared annotations/history, immutability and save restoration; implement restartGame in src/lib/game.ts.
3. Update use-note-selection.ts to begin selection on movement with no time gate, retaining hold and cancellation.
4. Update game.tsx, clock.tsx, icons.tsx and globals.css for the approved layout, restart confirmation/reset, semantic heading and gear.
5. Run lint, typecheck, tests and production build. Check immediate/held drag, fill skipping, modes, touch, cancellation, clock reset/reload, restart cancel/confirm, new puzzle, themes and narrow layout in Playwright.
6. Document bug and investigation evidence, capture screenshots, review diff, commit and open a PR. Do not merge before Sean reviews.
