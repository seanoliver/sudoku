# Project state after conversation loss

## Context
Sean lost access to the previous project conversation and requested a reconstruction from the repository. This records the state verified on September 20, 2026 (America/Los_Angeles; latest GitHub events are September 21 UTC).

## Key findings
- Fetched origin. Main is `ca79ebe`, with PR #12 (immediate drag selection, Settings cleanup, and restart) merged. GitHub CI and the Vercel commit status report success.
- Recent merged work includes incorrect-answer blocking (#8), rounded selection corners (#9), digit focus (#10), and batch exclusions/grouped keypad (#11). Earlier work established offline play, saves, Smart highlighting, manual notes/exclusions, Fill notes, batch notes, and required CI.
- The latest implementation is open PR #13, `feat/filled-cell-exit`, at `fa07dd0`. Selecting a filled cell exits batch selection. It is mergeable with successful CI and Vercel preview checks. Its plan records approval of option A and explicitly requests a PR without automatic merge.
- Open PR #7 contains the roadmap. Its file has been updated to mark #12 shipped, although its PR description still says awaiting merge. Remaining requests include constraint-aware number keys, unit celebrations, temporary Fill notes preview, and solve replay. Longer-term milestones are redo/checkpoints, candidate explanations, chosen deductions, progressive hints, and technique-based difficulty.
- Automatic deductions were deliberately removed from gameplay. Detection code remains available for future hints; notes and highlighting do not automatically apply advanced deductions. An unrestricted engine baseline fully reduces 86 of 100 sampled Hard puzzles.

## How it works
The Next.js/React/TypeScript app keeps game transitions and persistence in `src/lib/game.ts`, generation/uniqueness in `src/lib/sudoku.ts`, gestures in `src/components/use-note-selection.ts`, and UI in `src/components/game.tsx`. Production tracks GitHub main through Vercel Cabin 9. Feature work uses separate `.worktrees/` directories.

## Gotchas
- The root checkout is the old `ci/required-pr-checks` branch, not current main. Its five tracked modifications concern incorrect-answer blocking, whose integrated successor already merged in #8. Preserve these and the untracked docs, screenshots, and tests until intentionally reconciled.
- Local main is also stale. Use fetched origin/main to identify current merged behavior.
- Most feature worktrees are clean; old auto-notes and temporary smart-highlighting worktrees have additional local changes. Do not bulk-delete them without inspection.
- README and older plans describe earlier behavior. Prefer current source, merged PRs, and the roadmap branch for reconstruction.
- Physical iOS/Safari gesture verification remains outstanding according to recent validation notes. No fresh browser verification was performed during this reconstruction.

## Verification
- Inspected Git history, all worktree statuses, current source/diffs, plans, bug journals, and roadmap.
- Queried live GitHub PR states and checks for #7 and #13, main CI runs, and main's Vercel commit status.
- Reran `pnpm test` in `.worktrees/filled-cell-exit`: 63 passed, zero failed.
- No application code changed, branches switched, PRs merged, or deployments initiated.

## References
- https://github.com/seanoliver/sudoku/pull/13
- https://github.com/seanoliver/sudoku/pull/7
- https://github.com/seanoliver/sudoku/pull/12
- ../../.worktrees/feature-roadmap/docs/ROADMAP.md
- ../../.worktrees/filled-cell-exit/docs/plans/2026-09-21-filled-cell-exit.md
- ../../.worktrees/input-polish/docs/investigations/2026-09-21-input-polish.md
