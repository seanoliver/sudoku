# Batch Exclusions Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Apply an exclusion to selected empty cells through the approved keypad panel.
**Architecture:** Add an atomic addExclusions engine action and transient batch mode in the existing game component. Reuse the selection hook and keypad; batch mode is separate from single-cell entry mode.
**Tech Stack:** React, Next.js, TypeScript, CSS, Node test runner, Playwright MCP.

1. Add failing tests in tests/batch-exclusions.test.ts covering mixed annotations, ownership, undo, persistence, candidates, invalid targets and no-ops.
2. Implement addExclusions in src/lib/game.ts using one history snapshot and no mutation of the prior state.
3. Update src/components/game.tsx for batch mode, N/X shortcuts, action dispatch, panel layout and help copy; style with existing theme variables in src/app/globals.css.
4. Run tests, lint, typecheck and build. Use Playwright on / to check selection, mode switching, application, undo, focus independence, cancel, save/reload, phone/desktop and both themes.
5. Record findings in docs/investigations and save screenshots. Review the diff, commit and open a PR for Sean; do not merge without approval.
