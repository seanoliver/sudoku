# Configurable Deductions Implementation Plan

> Historical design. Gameplay now follows [manual notes and one-time Fill notes](../plans/2026-09-15-manual-notes.md); automatic deduction application and its settings have been removed.


> **For Codex:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Add three independently enabled deductions with learning examples and shared candidate results.

**Architecture:** Separate pure candidate elimination rules from board derivation and display selectors. Use one typed registry for rule metadata, execution, and preference recovery; derive automatic notes and highlights from the same resulting candidate sets.

**Tech Stack:** TypeScript, React, Next.js, Node test runner, Playwright MCP.

---

### Task 1: Deduction rules and candidate calculation

Files: `src/lib/deductions.ts`, `src/lib/candidates.ts`, `src/lib/sudoku.ts`, `tests/deductions.test.ts`, `tests/sudoku.test.ts`.

1. Write failing tests for pointing rows/columns, hidden pairs in every house type, and nonqualifying patterns.
2. Implement shrinking candidate-set rules and the registry.
3. Test and implement calculation from placed numbers, repeated enabled deductions, contradiction fallback, and display selectors. Move automatic note derivation from `sudoku.ts` to `candidates.ts` and update its existing tests.
4. Run `pnpm test`. Confirm rules never remove known solution candidates in generated puzzles.

### Task 2: Preferences and Settings

Files: `src/lib/preferences.ts`, `src/components/deduction-settings.tsx`, `src/components/game.tsx`, `src/app/globals.css`, preference tests.

1. Test independent boolean recovery, legacy preferences, and malformed deduction values before implementing the nested settings object.
2. Derive shared candidates once per board/settings change and connect both display selectors.
3. Render registry-driven toggles with native expandable examples and accessible explanations. Explain that manual notes are preserved.
4. Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.

### Task 3: Verification and review

Files: `docs/investigations/2026-09-14-deductions.md`, `docs/screenshots/deductions-*.png`.

1. Start the production build locally and verify toggles, examples, reload, manual notes, and both displays with Playwright MCP.
2. Verify light/dark mobile layout, scrolling, and keyboard operation; inspect screenshots and console errors.
3. Review the final diff and record verification results in the investigation entry. Commit the feature on its isolated branch.

### Task 4: Hidden singles

Files: `src/lib/deductions.ts`, `src/components/deduction-settings.tsx`, rule/candidate/preference tests, and example CSS.

1. Reproduce Sean's screenshot as an explicit board fixture; assert that the unique 4 at row 6 column 1 eliminates peer highlights while remaining a note.
2. Test hidden singles in rows, columns, and boxes, negative two-placement cases, preference migration, and all eight toggle combinations.
3. Register the new rule and example without changing the candidate execution loop or preference recovery.
4. Verify the screenshot in the local browser, update documentation and the existing draft PR, and check the Vercel preview deployment.
