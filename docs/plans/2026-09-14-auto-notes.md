# Auto Notes Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Automatically display notes when a digit has one or two legal placements in a 3 × 3 box.

**Architecture:** Derive an 81-cell note array from placed numbers using `possibleCells`. Render its union with manual notes behind a persisted preference, without modifying saved game snapshots.

**Tech Stack:** TypeScript, React, Next.js, Node test runner, Playwright MCP.

---

### Task 1: Candidate calculation and preferences

Files: `src/lib/sudoku.ts`, `src/lib/preferences.ts`, `tests/sudoku.test.ts`.

1. Add tests with explicit board fixtures for zero/one/two/three placements and independent boxes/digits. Test erase/undo and independence from manual notes. Add opt-in, old-save, and malformed preference tests.
2. Run `pnpm test`; confirm missing feature fails.
3. Implement `automaticNotes(values: number[]): number[][]`: initialize 81 empty arrays; for digits 1–9 group `possibleCells` by box; add a digit to groups of size 1 or 2.
4. Add boolean `autoNotes`, default false; restore only boolean values, preserving existing preferences.
5. Run `pnpm test`; expect all passing.

### Task 2: Board integration

Files: `src/components/game.tsx`.

1. Memoize automatic notes from current values when enabled.
2. Render the sorted unique union with manual notes, including accessible labels. Keep manual note actions and history unchanged.
3. Add a Settings switch and Help description explaining placed-number calculation and automatic note lifetime.
4. Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`; expect success.

### Task 3: Browser verification and documentation

Files: `docs/investigations/2026-09-14-auto-notes.md`, `docs/screenshots/auto-notes-phone.png`.

1. Start the local app with `pnpm dev --webpack --port 3101`.
2. Use Playwright MCP to verify enable/disable, manual-note preservation, entry/erase/undo, reload, and both themes. Inspect browser errors.
3. Capture and inspect a portrait screenshot, measuring equal board margins first.
4. Record observed results, review the diff, and commit only feature files on the feature branch.
