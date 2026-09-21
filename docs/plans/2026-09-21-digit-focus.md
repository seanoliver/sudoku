# Digit Focus Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Focus a digit using a button or filled-cell hold while preserving normal number entry and batch notes.

**Architecture:** Keep transient focusedDigit state in the game component, independent of selection and persisted game state. Extend the existing pointer gesture hook with a filled-cell hold callback; use the same pointer capture, timer, movement cancellation, and click suppression. Add a positive-note highlight prop and store shortcut discovery separately from game preferences.

**Tech Stack:** Next.js, React, TypeScript, CSS, Node test runner, Playwright MCP.

## Task 1: Establish baseline and failing browser check

Install locked dependencies. Run npm test. Start the app and select a filled cell; assert a Focus button exists (fails before implementation). Hold the cell and assert a focus indicator appears (fails before implementation).

## Task 2: Focus and gesture implementation

Modify src/components/game.tsx: focusedDigit state, selection switching, focus controls and tutorial persistence. Use focusedDigit ?? selected value for candidates/matching; reset when requesting a puzzle. Extend src/components/use-note-selection.ts with onFocus and a distinct filled-cell gesture, suppressing clicks and drag selection after focus. Keep empty-cell gesture behavior unchanged. Modify src/components/cell-notes.tsx to mark visible positive notes matching the focus. Add compact controls and note highlighting in src/app/globals.css. Update How to play.

## Task 3: Verify interaction and visual behavior

Repeat failing browser checks, then exercise both activation methods and the cases in the design. Check game JSON and history remain unchanged by focus. Inspect light/dark phone screenshots and desktop layout. Check storage failure is tolerated and learned-hint persistence survives reload. Run pnpm lint, pnpm typecheck, pnpm test, pnpm build, and git diff --check. Record actual evidence in docs/investigations/2026-09-21-digit-focus.md.

## Task 4: Review and PR

Review the complete diff against origin/main, exclude generated files, and commit only scoped changes. Open a focused PR with screenshots and verification, then wait for CI. Do not merge before user review of this new interaction.
