# Manual notes and one-time Fill notes implementation plan

> **For Codex:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Replace continuous deduction assistance with player-controlled notes, exclusions, and one-time candidate filling.

**Architecture:** Saved cell annotations contain notes, exclusions, and ownership. Player candidates use placed values and explicit exclusions only. The deduction engine remains isolated for future hints. Existing version-1 saves migrate ordinary notes to manual ownership, including undo snapshots.

**Tech Stack:** React, TypeScript, Node test runner, native Web Animations.

## Approved design

- Fill notes fills all basic legal candidates in unowned or generated empty cells, respects exclusions, and preserves manual cells. One action is one undo step; unchanged fills add no history.
- Notes and Exclude are mutually exclusive input modes. Exclusions toggle crossed-out digits and suppress Smart highlighting. Adding a note clears that digit's exclusion and vice versa.
- Generated notes use muted blue. Editing a cell's annotations transfers the whole cell to manual ownership, even if the last note is removed. Erasing annotations preserves that ownership. Number entry clears the cell's annotations and removes matching peer notes without taking ownership of those peers.
- Initial load is quiet. Fill additions and automatic peer-note cleanup retain subtle animations with reduced-motion support.
- Remove Auto notes and deduction settings from gameplay. Keep detection rules and their tests for future hints; no hints UI in this change.

## Tasks

1. Add failing tests in `tests/manual-notes.test.ts` for filling, ownership, exclusions, candidate filtering, undo, save migration, invalid annotations, and gameplay isolation. Run `pnpm test` to observe failures.
2. Implement snapshot annotations and operations in `src/lib/game.ts`, player candidates in `src/lib/candidates.ts`, and remove obsolete preferences from `src/lib/preferences.ts`. Update preference tests to verify retired settings are ignored.
3. Update `src/components/game.tsx`, `src/components/cell-notes.tsx`, and `src/app/globals.css` for Fill notes, Exclude mode, ownership colors, accessible labels, and Help. Remove the obsolete deduction settings component and styles.
4. Run tests, type checking, lint, and production build. Browser-check one-time filling, ownership, exclusions, undo/reload, highlight filtering, old settings, phone layout, themes, and reduced motion. Capture current UI screenshots.
5. Review changes, document final behavior, rewrite PR title/body around the approved scope, commit and push to the existing preview. Verify deployment without merging.
