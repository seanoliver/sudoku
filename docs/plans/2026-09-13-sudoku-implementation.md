# Sudoku Implementation Plan

> **For Codex:** Use executing-plans to implement this plan task-by-task.

**Goal:** Build an installable, offline Sudoku game with immediate mobile interactions.

**Architecture:** Pure puzzle and state modules drive a React client inside Next.js App Router. A separate puzzle worker handles generation; a build-generated service worker caches the complete static shell. All progress stays on the device.

**Tech Stack:** Next.js, React, TypeScript, CSS, Web Workers, Service Workers, Node test runner.

## Task 1: Project and engine

Create package/config files, `src/lib/sudoku.ts`, `src/lib/game.ts`, and `tests/sudoku.test.ts`. Install dependencies with `pnpm install`. Write failing tests for generated unique boards, givens, peer conflicts, undo, notes, and save validation; run `pnpm test`, then implement and rerun. Use MRV backtracking with a solution count cap of two; remove a clue only if count remains one.

## Task 2: Game surface

Create `src/components/game.tsx`, `src/components/icons.tsx`, `src/components/clock.tsx`, `src/lib/puzzle.worker.ts`, `src/app/page.tsx`, `src/app/layout.tsx`, and `src/app/globals.css`. Build accessible board with roving keyboard focus, touch number pad, native dialog sheets, selected/peer/matching/conflict states, undo/erase/notes, pause, local progress restore, and completion. Keep timer updates in its own component. Review phone and desktop screenshots and refine spacing.

## Task 3: Installation and offline

Create `src/app/manifest.ts`, `scripts/build-sw.mjs`, `scripts/icons.mjs`, and generated `public/icon-*.png`. Read framework and browser API docs/types before API usage. Build worker cache from `.next/static` and app-shell URLs; test production offline reload and generation. Register only in production; show actual readiness and installation options.

## Task 4: Verify and hand off

Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`. Start production on an unused port, inspect through Browser, and record findings in `docs/investigations/2026-09-13-pwa-verification.md`. Write README with start/install instructions and limitations. Commit the reviewed initial app. Read `build-in-public.status` and ask once if unset after work is complete.
