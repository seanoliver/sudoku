# Compact Controls Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Simplify the main toolbar to Notes, nested Exclude, and contextual Erase.

**Architecture:** Keep existing game transitions and selection hook. Change mode transitions and presentation in game.tsx, move secondary actions to Settings, and replace retired toolbar CSS with a single responsive row.

**Tech Stack:** Existing React/Next.js/TypeScript, node:test and live Playwright MCP.

### 1. Baseline and UI behavior
- Run pnpm install --frozen-lockfile and pnpm test (69 tests).
- Confirm old toolbar shows separate Exclude and disabled Erase on empty cells.
- In src/components/game.tsx derive notesActive from batch selection or non-value mode; N toggles Notes, X toggles exclusions only inside Notes. Reuse enter(value:0) for single-cell erase.
- Replace tools and batch-modes with a shared Notes/Exclude/Erase control row. Preserve batch count/clear and gesture handling. Move Undo/Fill notes into Settings.

### 2. Styling and help
- Update src/app/globals.css: fixed-height row, Notes switch, compact Exclude pill with checkmark/rose active state, contextual Erase aligned right. Remove now-unused toolbar and batch mode selector styles.
- Update help and README to match modes, erase behavior and Settings actions.
- Run pnpm lint, pnpm typecheck, pnpm test, pnpm build and git diff --check.

### 3. Verify and handoff
- Live browser checks: empty/given/entered/noted/excluded cells, Notes/Exclude toggling, keyboard equivalents, erase/undo exact restore, Fill notes in Settings, batch start/extension/cancel/completion/filled-cell exit, filtered keypad exemptions and normal value input.
- Inspect actual phone captures for light/dark, both annotation states and Settings. Check 320px and desktop overflow and stable keypad placement.
- Record investigation evidence and limitations, commit scoped changes, push and open a PR. Do not merge.
