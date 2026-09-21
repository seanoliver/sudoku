# Number Filter Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Add optional constraint-based filtering of normal number entry with muted keys.

**Architecture:** A pure peer-based helper supplies UI availability and an entry guard. Preferences migrate the new flag independently with default false; annotations bypass the guard.

**Tech Stack:** Existing TypeScript, React, Next.js, node:test, Playwright MCP. No new dependencies.

### 1. Behavior and preferences
- Add tests/number-filter.test.ts for row/column/box rejection without state changes, replacement ignoring self, erasure/undo, annotations/batches bypassing filtering, solution independence, and preference migration.
- Run node --experimental-strip-types --test tests/number-filter.test.ts; observe failures before implementation.
- Add getEntryDigits({values,index}) in src/lib/sudoku.ts using peers(index), filtering digits 1–9 by peer values. Guard enter in src/lib/game.ts only when filterNumberKeys && !pencil && !exclude && value !== 0.
- Add filterNumberKeys: false to src/lib/preferences.ts defaults; restore only boolean values. Update existing full-object preference assertions for the new field.
- Run pnpm test until green.

### 2. UI
- In src/components/game.tsx derive availability from the selected cell, share it with keyboard rejection feedback, add native disabled keypad state/description, Settings switch, and short help copy.
- In src/app/globals.css add a muted neutral key style using existing tokens; keep geometry/counts unchanged. Add filter path to src/components/icons.tsx using existing SVG conventions.
- Run pnpm lint, pnpm typecheck, pnpm build, git diff --check.

### 3. Browser and handoff
- Verify setting default/persistence, mouse/touch/keyboard parity, no-candidate feedback, entered-cell replacement, erase/undo/restart updates, annotation modes and batches, and Block incorrect answers independence.
- Inspect light/dark phone screenshots with 17px equal margins at 390px, plus 320px/desktop overflow checks.
- Update README and docs/investigations with evidence and limitations, review final diff, commit and open a PR. Do not merge.
