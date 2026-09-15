# Smart Highlighting Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Highlight legal empty cells for the selected filled cell's digit when enabled.

**Architecture:** Add a pure candidate calculation alongside peers in the Sudoku library. Derive board highlights from current values and selection; persist a separate optional setting with backwards-compatible restoration.

**Tech Stack:** Next.js, React, TypeScript, CSS, Node test runner, Playwright MCP.

## Task 1: Candidate calculation and preferences

Files: `src/lib/sudoku.ts`, `src/lib/preferences.ts`, `tests/sudoku.test.ts`.

1. Write tests for row/column/box exclusion, occupied cells, no active digit, current entries and undo. Add tests for old preferences and the new boolean (including malformed values).
2. Run `pnpm test` and confirm the new feature tests fail.
3. Export `possibleCells(values: number[], digit: number): Set<number>`, returning empty for digits outside 1–9 and otherwise empty indexes without matching peers.
4. Add `smartHighlighting: false` to defaults and restore it only when it is a boolean; preserve existing valid preferences.
5. Run `pnpm test` and confirm all tests pass.

## Task 2: Board and settings

Files: `src/components/game.tsx`, `src/app/globals.css`.

1. Memoize possibilities from the current values and selected value when the preference is enabled and game is incomplete.
2. Add a possible class and accessible description to candidate cells. Add a separate Smart highlighting switch and concise help instructions.
3. Define a green candidate background in light, explicit dark, and system dark themes. Place its rule after related-cell styling and before selected/conflict styling.

## Task 3: Verification and documentation

1. Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.
2. Start this app locally and use Playwright MCP to verify toggles, selecting different filled cells, clearing on empty selection, persistence, edits/undo, and independent related-cell settings.
3. Inspect screenshots in light/dark and a mobile viewport.
4. Record findings and evidence in `docs/investigations/2026-09-14-smart-highlighting.md` using the repository template.
5. Review the diff, bring completed changes into the user's workspace, and report the result.
