---
name: rendering-design-directions
description: Use when starting any new Sudoku feature or visible UI change, before implementation, and when Sean asks for mockups, options, or "a few directions". Also use when a feature needs a new visual element inside an existing screen, such as a new walkthrough mark or keypad state.
---

# Rendering design directions

Sean picks a direction from three renders of the real app before any implementation. Sean can skip this for a feature by saying so, or by specifying the design himself (see `docs/plans/2026-09-23-keypad-cleanup-design.md`).

## Steps

1. **Read first.**
   - `docs/ROADMAP.md`: find the entry for this feature. Entries often already state what the directions must cover (R10 asks for a history or stats view). Use its name and number. If none exists, propose a new `R<n>` in step 2, where `n` is one more than the highest in `grep -o 'R[0-9]*\.' docs/ROADMAP.md` (headings are not in number order).
   - The roadmap's "Assistance boundaries" and "Delivery discipline" sections. Flag any conflict with the feature (for example, a shared daily puzzle against local-only play) in step 2.
   - The two design docs with the latest filename dates in `docs/plans/*-design.md`, for tone and format.
   - AGENTS.md "show, don't explain".
2. **Ask scope questions only if the answer changes the renders.** Batch them in one message, each with a proposed default, including any new roadmap entry and rule conflicts from step 1.
3. **Pick three directions that differ in structure**, not color: where the UI lives (on the board, above the keys, a sheet, a page) or how it is triggered. Name each in 2–4 words.
4. **Prototype inside the app** in a scratch worktree (using-git-worktrees), switched by a query param: `?<feature>=a|b|c`. (Hint explanations used `?why=a`; that wiring was removed before merge, so write the switch fresh.) Seed state with `addInitScript` and the helpers in `e2e/fixtures.ts`. Leave `main` untouched.
5. **Render each of the feature's own states** (for a stats view: no data, typical, many entries) at 390 × 844, `scale: 'css'`, reduced motion. Render light and dark when the feature adds or changes color. Motion: record a short `.webm` as well.
6. **Combine** each state into one side-by-side image, A | B | C, labeled. Write a short `sharp` script for this (a devDependency; no helper exists yet). Save renders in the scratchpad.
7. **Present and stop.** Send the composite with SendUserFile; if that tool is unavailable, run `open <path>` and list the paths, with one line per direction on its trade-off, and a recommendation. Do not write implementation code until Sean chooses.
8. **Record the choice.**
   - Copy the chosen render to `docs/designs/<feature>-approved.png` (and `.webm` for motion).
   - Write `docs/plans/YYYY-MM-DD-<feature>-design.md`. The first paragraph states the roadmap item, the date, the direction chosen, the three options by name, and the reference file. Match `docs/plans/2026-09-23-entry-modes-design.md`.
   - Update the roadmap entry's status.
9. **After implementing,** capture the built UI at the same states and compare it with the approved render side by side before calling it done.

## Common mistakes

- Three directions that are the same layout with different colors.
- Rendering only the happy path, or only light mode for a color feature.
- Explanatory text in the renders where an icon, color, or position would do.
- Creating a new roadmap item when one already exists.

## Out of scope

- The implementation plan (writing-plans) and the code.
- Share screenshots of shipped features (capturing-share-screenshots).
- Bug fixes that restore existing, approved behavior.
