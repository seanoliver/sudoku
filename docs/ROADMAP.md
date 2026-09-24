# Sudoku feature roadmap

Updated: September 22, 2026. These are proposed milestones in implementation order, without date commitments. Each milestone should ship independently and be checked in real play before starting the next.

## Product goal

Make steady progress through a puzzle feel fast and effortless. Reduce repetitive input, make player decisions easy to inspect and reverse, and offer progressively more help on request. The player chooses deductions and placements.

## Current foundation

Already merged into `main`:

- Offline play, local saves, undo, and keyboard controls.
- Light, Dark, and System appearance in Settings. System is the default and follows device appearance changes; explicit Light or Dark overrides it. The choice persists on this device. Sean reaffirmed this requirement on September 22.
- CI on pull requests runs lint, typechecks, unit tests and the production build/service-worker generation. The active [main ruleset](https://github.com/seanoliver/sudoku/rules/23413937) requires the CI check, an up-to-date branch and a PR, with no configured bypass actors. The connected Vercel workflow deploys merged main commits.
- Optional Smart highlighting, manual notes and exclusions, and one-time Fill notes.
- Digit focus through an explicit button or filled-cell hold, with an integrated board toolbar ([PR #10](https://github.com/seanoliver/sudoku/pull/10)).
- Hold/drag selection for batch notes and exclusions, with one undo step per batch and a grouped keypad panel containing Clear selection ([PR #11](https://github.com/seanoliver/sudoku/pull/11)).
- Compact annotation controls with contextual Erase and Undo/Fill notes in Settings ([PR #15](https://github.com/seanoliver/sudoku/pull/15)). The Notes switch and Exclude chip were later replaced by a Numbers | Notes | Exclude control (R3).

Pointing-pair, hidden-pair, and hidden-single logic exists in the engine, but it does not automatically change gameplay notes or highlighting. Difficulty currently uses clue density. Persistent Redo has shipped in [PR #18](https://github.com/seanoliver/sudoku/pull/18). Explanation records, progressive hints, and technique-based grading remain future work.

## Sequence

| Order | Milestone | First useful release | Dependency |
| --- | --- | --- | --- |
| 1 (shipped) | Digit locking | Keep one digit highlighted while scanning and annotating | Existing Smart highlighting |
| 2 (shipped) | Batch exclusions | Record one deduction across multiple cells | Existing batch selection; coordinate with digit lock |
| 3 | Recovery | Persistent redo, action descriptions, then a checkpoint | Stable batch actions from milestone 2 |
| 4 | Candidate explanations | Inspect basic constraints and distinguish manual exclusions | Recovery support for future explanation state |
| 5 | Apply a chosen deduction | Validate and apply a player-selected pointing pair | Explanation records from milestone 4 |
| 6 | Progressive hints | Reveal one supported move in optional steps | Explainable detection from milestones 4 and 5 |
| 7 | Technique-based difficulty and practice | Grade puzzles by supported logical techniques | Reliable step traces from milestone 6 |

Digit focus and batch exclusions have shipped. The new requests below add an input and layout pass before recovery; speed replay should follow the action-recording work alongside recovery. This is a proposed order, not a commitment to start implementation. Explainable detection can be developed before the hint UI, but every explanation must refer to a valid board state.

## Requested additions: input, layout, feedback and replay

Captured from Sean's September 20 feedback and the [September 21 playtest](playtests/2026-09-21.md). Each item needs its own design review before implementation.

### Optional constraint-aware number picker

**Status:** Shipped as Filter number keys in [PR #14](https://github.com/seanoliver/sudoku/pull/14).

**Playtest follow-up (September 21):** Disable impossible numbers when an empty cell is selected, with a configurable setting. This request is covered by the shipped setting.

**Player benefit:** Avoid choosing a number already ruled out by filled cells.

- Add an optional setting that disables impossible number keys for the selected cell.
- Compute availability only from filled values in that cell's row, column and box. Do not use the stored solution, notes, manual exclusions or advanced deductions.
- When replacing an editable filled cell, ignore its own value while evaluating peer constraints. Update immediately when selection or filled values change, including erase, undo, redo and restart.
- Keep this setting distinct from Block incorrect answers, which checks against the solution.
- During design, define its scope for note/exclusion modes and multi-cell selection. Annotation controls must still allow removing notes and recording exclusions; do not silently apply a single-cell filter to a batch.

**Completion criteria:** Disabled states are clear and accessible, touch and keyboard value entry agree, and disabling the preference restores current entry behavior. A number that is legal under filled-cell constraints remains available even when it is not the solution or has been manually excluded.

### Immediate drag selection

**Status:** Shipped in [PR #12](https://github.com/seanoliver/sudoku/pull/12).

**Player benefit:** Start selecting cells as soon as a drag begins, without waiting while holding still.

- Begin batch selection when movement crosses a small drag threshold on an empty cell, regardless of how little time has passed since pointer-down.
- Retain stationary hold as an alternative; elapsed hold time must not gate dragging. Include the starting cell and every eligible cell crossed by the drag.
- Preserve Add note/Exclude mode when extending a batch. Filled-cell hold still focuses a digit; a drag must not accidentally focus or enter a number.
- Resolve touch scrolling and drag intent during design, preserving normal taps, cancellation and multi-touch handling.

**Completion criteria:** A drag that begins immediately after pointer-down selects cells without a preliminary stationary hold. Slow and fast drags, existing selections, pointer cancellation and touch scrolling are checked on phone and desktop, including physical iOS/Safari.

### One title and puzzle actions in Settings

**Status:** Shipped in [PR #12](https://github.com/seanoliver/sudoku/pull/12). Includes a gear button, gameplay-setting icons, and immediate preference saving without greetings or Done.

**Player benefit:** Give the board more space and keep puzzle management together.

- Keep the top app-bar Sudoku branding.
- Remove the second Sudoku heading, its “Take your time.” tagline and its adjacent New puzzle button; remove the unused heading-row space.
- Move New puzzle into Settings, preserving difficulty choice and the existing puzzle-replacement flow.
- Add Restart puzzle in Settings. Restart uses the same givens and solution, resets entries, notes, exclusions and elapsed time, and clears transient selection/focus.
- Design clear restart confirmation and define how restarting interacts with undo, checkpoints and replay attempts. Keep New puzzle and Restart puzzle distinct.

**Completion criteria:** The game shows one Sudoku title, both actions are available in Settings, restarting preserves puzzle identity, and starting a new puzzle still supports difficulty selection. Verify keyboard access and both themes.

### Exit batch selection by selecting a filled cell

**Status:** Shipped in [PR #13](https://github.com/seanoliver/sudoku/pull/13).

**Player benefit:** Return to normal selection with one tap while scanning the puzzle.

- Clicking or tapping a filled cell while batch selection is active clears all batch targets, exits Add note/Exclude batch mode, and selects that filled cell normally.
- Support both givens and player-entered values, including keyboard/assistive activation.
- Keep this distinct from dragging across a filled cell, which still skips it without ending the batch. Preserve filled-cell hold for digit focus.
- Clearing the batch must not edit annotations or add undo history. Existing digit focus follows the normal filled-cell selection behavior.

**Completion criteria:** The batch panel disappears, the clicked value becomes selected, and no selected empty cells remain. Verify tap versus drag versus hold, both annotation modes, digit focus, and keyboard input afterward.

### Small celebrations for completed units

**Status:** Shipped in [PR #26](https://github.com/seanoliver/sudoku/pull/26) ([design](plans/2026-09-23-unit-celebrations-design.md)). A pale green sweep ripples from the entered cell across each newly completed row, column and box; the final entry sweeps the whole board.

**Player benefit:** Notice progress when a row, column or 3×3 box (house) is completed.

- Play a brief, subtle animation on the completed unit when a player's entry changes it from incomplete to validly complete.
- A completed unit contains 1–9 exactly once. Nine filled cells with duplicates must not trigger a celebration.
- Handle a move completing several units together without stacking distracting effects; coordinate with the full-puzzle completion treatment.
- Keep inputs responsive, preserve selection/highlights and respect reduced motion. Loading a save or opening Settings must not replay celebrations.
- Define how undo/re-entry and later speed replay handle these effects, so undo itself does not celebrate and repeated playback stays controlled.

**Completion criteria:** Each newly completed row, column and box is detected once per qualifying move. Effects are brief, readable in both themes, do not change game state, and have a restrained reduced-motion alternative.

### Fill notes: permanent fill or temporary preview

**Player benefit:** Inspect possible notes without committing them to the puzzle.

- Preserve the current permanent Fill notes action and add a clearly distinguished temporary preview option. Choose the exact interaction during design.
- Preview possible notes as a read-only overlay, then remove only the preview when dismissed. Existing notes and exclusions remain visible and unchanged.
- Use the same candidate rules as the current fill: placed-number constraints and manual exclusions, with no automatic advanced deductions or solution lookup.
- Preview must not claim annotation ownership, write saved notes, or add undo history. Permanent fill replaces notes in every empty cell while retaining exclusions, per the September 22 clarification.
- Make it clear when preview is active and easy to end. Define dismissal on release/toggle, board edits, pause, dialogs, restart and new puzzle; never leave stale preview candidates visible.
- Check interaction with digit focus, batch selection and the future optional number picker.

**Completion criteria:** Showing and dismissing preview restores the exact prior annotations, ownership and history. Committing a permanent fill remains a separate explicit action. Verify empty/manual/generated notes, exclusions, edits, undo and reopening.

### CI/CD merge gates

**Status:** Already implemented and verified against the live repository rules on September 20.

- Pull requests must pass the required CI job before merging to main. The job runs lint, typechecks, unit tests and the production build, including service-worker generation.
- Main requires an up-to-date branch and PR-based changes; its active ruleset has no configured bypass actors.
- Keep these requirements aligned with workflow check names so future changes do not weaken or deadlock the gate.
- Continue the connected GitHub-to-Vercel deployment flow after merge and verify production deployment status. Preview deployments do not replace required CI.

**Completion criteria:** A failed or missing required check prevents a normal merge, and successful CI permits merging under the active branch rules. Keep the checked-in ruleset and live configuration consistent.

### Speed replay after completion

**Player benefit:** Watch a quick animation of the solve, showing entries in the order they were made.

- Add an optional Replay action to the completion screen; play a compressed animation from the initial givens through the player's actual actions.
- Record chronological actions while playing, including entries, corrections/erasures, annotations, batch edits and undo/redo, so replay shows what happened rather than reconstructing only the final solution.
- Keep a replay log separate from the bounded undo stack: undo/redo retains at most 200 snapshots and discards the redo branch after a new edit, so it cannot represent a complete solve.
- Persist replay progress records across reopening. Define restart/attempt boundaries and storage limits with recovery work; distinguish older saves with incomplete logs instead of fabricating missing moves.
- Provide a way to stop or skip playback, respect reduced motion, and leave the completed puzzle, time and history unchanged.

**Completion criteria:** Playback preserves action order, includes the final entry and reaches the completed board. Long pauses are compressed, corrections are visible, and viewing replay is read-only. Verify long solves, reopened games, restarts and legacy saves.

## September 21 additions

Source: [original playtest notes and coverage](playtests/2026-09-21.md). Status: requested, pending design. Proposed placement: alongside the input and feedback work before recovery. Their internal order is undecided. The configurable number picker has shipped and is tracked in the existing section above.

### Default number focus

- Make number focus the default when selecting a number, without requiring the separate focus action.
- Define which selections activate focus, how it clears, and how it interacts with selecting empty cells and entering values. Preserve explicit entry and annotation behavior.
- This extends shipped digit focus; the default selection behavior remains new work.

**Completion criteria:** Selecting a number activates a visible focus state, and changing or clearing focus works consistently with Smart highlighting, note/exclusion modes, touch and keyboard.

### Number-row focus

**Status:** Shipped in [PR #17](https://github.com/seanoliver/sudoku/pull/17) using the existing focus indicator and controls. Empty-cell entry and annotation modes are preserved; filled-cell digit input focuses without replacing values.

- With a filled cell or no cell selected, tapping a number in the number row focuses the tapped digit. This applies to both givens and player-entered values.
- Coordinate with default number focus and the constraint-aware picker.
- **Decision (September 22):** Only an empty selected cell receives value entry from the number row. A filled selected cell makes the number row focus the tapped digit without replacing the existing value. Preserve note/exclusion mode behavior.

**Completion criteria:** With an empty cell selected in value-entry mode, tapping a number enters it. With a filled cell or no cell selected, tapping a number focuses the tapped digit without changing any values or annotations. Cover both givens and player-entered values, including tapping a digit different from the selected cell’s value. Note/exclusion actions remain intact.

### More obvious incorrect-entry feedback

**Status:** Shipped in [PR #23](https://github.com/seanoliver/sudoku/pull/23) ([design](plans/2026-09-23-rejected-entry-feedback-design.md)). A rejected entry shows the digit in red, struck diagonally, in the selected cell; it shakes and fades within 0.8s. Filter number keys rejections also outline the peer cells that already hold the digit. A live region replaces the old hint text.

**Decision (September 23):** With Block incorrect answers off, wrong entries are accepted and stay unmarked. Feedback applies only to rejected attempts.

- Make an incorrect entry or blocked incorrect-entry attempt clearly noticeable.
- Define feedback for the current Block incorrect answers setting, including its enabled and disabled states.
- Include a cue beyond color, support assistive announcements, and respect reduced motion. Choose the visual treatment during design.

**Completion criteria:** A player can tell that an entry was rejected or marked incorrect and identify the affected cell. Feedback preserves the selected cell, annotations and existing correctness-setting semantics.

### Faded red exclusions

**Status:** Shipped in [PR #24](https://github.com/seanoliver/sudoku/pull/24) ([design](plans/2026-09-23-excluded-highlighting-design.md)). Uses a faded red fill; the existing struck note in the cell is the cue beyond color.

- For the active digit, show a faded red background on cells that would be green under Smart highlighting except that the player crossed out that digit.
- Keep these cells distinct from cells ruled out by placed-number constraints and from incorrect entries. A manual exclusion remains an unverified player annotation.
- Preserve crossed-out notation and a distinction beyond background color in both themes.

**Completion criteria:** Adding or removing an exclusion switches an otherwise eligible cell between green and faded red. Placements, digit changes and undo refresh the state without changing annotations.

### Optional sole-candidate autofill

- Add an option to fill a cell when only one candidate is possible and that candidate is noted in the cell.
- Validate candidate eligibility independently of the visible note count. One handwritten note alone does not establish that only one candidate is possible.
- **Open questions:** Define whether manual exclusions count as evidence, which event triggers filling, and whether subsequent fills require another action. Resolve these against the assistance boundaries below before implementation.
- Make resulting placements and annotation changes undoable; define how they appear in future replay and scoring records.

**Completion criteria:** With the option disabled, entry behavior is unchanged. With it enabled, only cells meeting the agreed candidate and note conditions fill. Incomplete notes cannot silently produce unsupported placements.

## September 21 research

Status: queued for research. The feature outcomes below are uncommitted. Complete each spike with findings, a recommendation, unresolved questions and a scope proposal before adding its outcome to the implementation sequence. Use `docs/investigations/TEMPLATE.md` for findings and `docs/bugs/TEMPLATE.md` for any resulting non-trivial bug fix. The original observations remain in the [playtest record](playtests/2026-09-21.md).

### R1. Missing populated notes

- **Observation:** Fill notes left individual cells empty, including cells with earlier notes and cells with no visible notes. Sean clarified that Fill notes should replace all possible notes and retain exclusions.
- **Status:** Reproduced and diagnosed. The manual-edit flag caused entire cells to be skipped; adding and removing annotations left that flag behind. A local fix rebuilds every empty cell while preserving exclusions. See the [investigation](investigations/2026-09-22-fill-notes.md).
- **Research:** Capture a reproducible board and action sequence. Compare placed-number constraints, exclusions and manual-note ownership, including intentionally cleared notes, undo and reopened saves.
- **Output:** A minimal reproduction and a classification of algorithm defect, persisted-state issue or confusing expected behavior. Propose a targeted fix or interaction clarification with a regression case.
- **Proposed dependency:** Resolve before implementing temporary note preview or sole-candidate autofill, since both depend on trustworthy candidate and annotation behavior.

### R2. Difficulty beyond Hard

- **Observation:** The game needs a level harder than Hard.
- **Research:** Evaluate current Hard puzzles by required techniques and solving effort, including enabled assistance. Assess whether the existing generator and supported deductions can reliably produce and grade a harder tier.
- **Output:** A proposed difficulty definition, representative puzzles and validation criteria, plus dependencies on milestone 7's technique grading. Naming and delivery timing remain open.

### R3. Annotation mode switching

**Status:** Shipped in [PR #27](https://github.com/seanoliver/sudoku/pull/27) ([design](plans/2026-09-23-entry-modes-design.md)). A one-tap Numbers | Notes | Exclude control replaces the Notes switch and Exclude chip, the number keys show the active mode, batches keep the annotation mode, and X works from any mode.

- **Observation:** Switching between note and exclude mode is still too difficult.
- **Research:** Observe single-cell and batch annotation sequences on a phone, count required actions, and identify mode confusion. Include interactions with default digit focus and number-row selection.
- **Output:** A recommended interaction flow and a focused usability test for switching modes without accidental values or annotations. Prepare design directions if promoted to implementation.

### R4. Number-row presentation

**Status:** Shipped in [PR #28](https://github.com/seanoliver/sudoku/pull/28) ([design](plans/2026-09-23-number-row-counts-design.md)). Remaining counts are removed; a digit with all nine placed fades out. Sean chose this over a progress bar and remaining-count dots on September 23.

- **Observations:** Remaining-number counts look messy; consider the Good Sudoku style number row.
- **Research:** Inspect the referenced app's number-row behavior and identify which aspects address the playtest problem. Compare count presentation, completion states, focus, entry and annotations within the available phone width. Clarify whether “remaining” counts placements, correct placements or another measure.
- **Output:** A number-row recommendation with count semantics and interaction tradeoffs, coordinated with the requested focus and constraint-aware picker changes.

### R5. Deduction scoring

- **Idea:** Earn points based on the difficulty of deductions the player makes.
- **Research:** Determine how a deduction can be recognized and validated from player actions, including ambiguous move sequences, manual exclusions, assistance, undo and repeated actions. Assess dependencies on explanation records and chronological action history.
- **Output:** A proposed scoring model with worked examples, evidence requirements and rules preventing repeated credit. Record any deductions that cannot be inferred reliably.

### R6. Candidate comparison

- **Ideas:** Compare highlighted numbers to see their overlap, or highlight only cells where the same numbers appear.
- **Research:** Clarify whether the desired comparison is between digits, cells or candidate sets. Use concrete boards to distinguish candidate-location intersections from identical or shared note sets, and evaluate whether either helps a player make a deduction.
- **Output:** Worked examples and a recommendation to pursue either interaction, both, or neither. Define note/exclusion semantics and avoid presenting incomplete pencil marks as verified patterns.

### R7. Accomplishments and sharing

- **Idea:** Store, celebrate and share significant wins or accomplishments, including high-quality Instagram-native stories for particularly good wins.
- **Research:** Define meaningful accomplishments and the solve evidence needed to preserve them. Explore local storage and retrieval, completion/replay integration, and story composition and export/share feasibility on phones.
- **Output:** An accomplishment model and a proposed save-to-share flow, including what “Instagram-native” means for delivery. Capture current platform requirements during the spike and propose story design directions before implementation.
- **Relationship:** Coordinate with existing unit celebrations and speed replay. Persistent accomplishments and external sharing require their own scope decision.

### R8. Number grid keypad

- **Idea:** Replace the one-row number pad with a 3 × 3 number grid, as Good Sudoku does. Sean asked on September 23 to keep this as a separate, larger redesign.
- **Research:** Compare a 3 × 3 grid with the current row on a 390px-wide phone: key size, reach, how the grid sits beside or below the board, and how entry modes (Numbers, Notes, Exclude), Erase, digit focus, number filtering, and the batch keypad fit. Check how the grid mirrors a cell's note layout.
- **Output:** Three rendered layout directions for Sean, then a scope proposal. Coordinate with the entry mode switch (R3) and the number-row presentation (R4).

## 1. Digit locking

**Status:** Shipped as digit focus in [PR #10](https://github.com/seanoliver/sudoku/pull/10).

**Player benefit:** Select 4 once and scan its possible locations without repeatedly finding and tapping a filled 4.

- Provide an explicit way to pin a digit, with a visible active-digit indicator and clear action. Choose the gesture during feature design so ordinary keypad entry remains predictable.
- Keep matching values, notes, and possible cells visible while the player selects empty cells or changes annotation mode.
- Keep digit focus separate from cell selection. Clearing a batch clears the batch; clearing the digit removes the lock.
- Start with a transient lock that resets for a new puzzle. Preserve the existing opt-in Smart highlighting behavior.

**Completion criteria:** Digit focus never places a value by itself. Switching digits, clearing the lock, adding notes, and entering values work predictably with touch and keyboard. Highlighting follows placements, exclusions, and undo.

## 2. Batch exclusions

**Status:** Shipped with the grouped keypad panel in [PR #11](https://github.com/seanoliver/sudoku/pull/11).

**Player benefit:** After finding a pointing pair, select affected cells and rule out the digit in one action.

- Extend selection with labeled Add note and Exclude choices near the board.
- Apply an exclusion consistently to the selected empty cells. Already-excluded digits stay excluded; mixed selections never toggle unpredictably.
- Remove matching positive notes, update Smart highlighting, and record one undo step.
- Preserve the current finish behavior: entering the digit clears the batch and returns to normal entry.

**Completion criteria:** Filled cells are skipped, duplicate selections are harmless, and a no-op creates no history. One undo restores notes, exclusions, and note ownership exactly. Manual exclusions do not trigger deductions elsewhere.

## 3. Recovery

**Status:** Persistent Undo/Redo shipped in [PR #18](https://github.com/seanoliver/sudoku/pull/18) in Settings, with keyboard shortcuts and a shared 200-action limit. Action descriptions and checkpoints remain deferred.

**Player benefit:** Correct an accidental action without losing work or reconstructing a previous position.

Deliver in two small releases:

1. Add Redo and brief action descriptions such as “Undid notes in 4 cells.” Persist undo and redo across reopening. A new edit after Undo clears the redo branch; selection-only changes leave history untouched.
2. Add one explicit checkpoint per puzzle. Restoring it recovers values and annotations together and is itself undoable. Label the checkpoint so its contents are clear.

**Completion criteria:** Batch edits remain atomic, save migration preserves existing puzzles, and restore/undo/redo keep annotation ownership intact. Define bounded history and checkpoint storage before implementation.

Coordinate action descriptions and persistence with the requested speed replay, while keeping the complete replay log separate from bounded undo history. Define checkpoint and restart events so playback remains chronological.

This precedes applied deductions because their affected notes and explanations must be reversible together.

## 4. Candidate explanations

**Player benefit:** Ask why a digit is unavailable and understand what is restricting it.

- Start with placed-number constraints: highlight the conflicting row, column, or box and its relevant values.
- Identify an unverified manual exclusion as “You ruled this out.” Missing pencil marks never establish an exclusion or a complete candidate list.
- Introduce structured deduction records containing the technique, supporting cells and digits, affected candidates, and supporting board state. Adapt existing deduction functions to return inspectable steps; their current mutation/boolean output is insufficient for explanations.
- Keep player annotations separate from candidates justified by rules. An incorrect manual exclusion must not become evidence for a verified hint.

**Completion criteria:** The app distinguishes a basic constraint, a manual exclusion, and a verified deduction. Explanation highlights match their text. Board edits invalidate stale previews. If a supporting value changes, suspend any deduction-derived exclusions that no longer validate, including dependent deductions. Keep their records available for inspection and preserve separately entered manual annotations. Suspended deductions cannot constrain hints or Smart highlighting. Save and undo handling preserve these distinctions.

## 5. Chosen deductions

**Player benefit:** Find a pattern yourself, then let the app record its consequences.

- Start with pointing pairs. The player selects supporting cells and a digit, then chooses Use this deduction.
- Validate that the digit has exactly those two possible locations in the box and that they share a row or column. Two matching pencil marks alone are insufficient evidence.
- Preview affected candidates in muted red with a short explanation. Apply requires an explicit action and creates one undo step with its explanation record.
- Apply only that step. Later deductions remain available for the player to find or request.
- Add hidden pairs and hidden singles as separate follow-ups after pointing-pair behavior is reliable. Placements require explicit confirmation too.

**Completion criteria:** Invalid or unsupported selections get a useful explanation without changing the puzzle. Preview and apply use the same board revision. Undo restores every affected annotation and explanation. Editing a supporting value cannot leave an invalid deduction presented as verified.

## 6. Progressive hints

**Player benefit:** Get enough direction to resume solving, with control over how much is revealed.

- Offer one Help entry point with a stable sequence: name a technique, identify an area, highlight the supporting cells/digits, then explain the move.
- Each reveal requires another tap. Let the player dismiss help at any stage and try the move themselves.
- Keep hint viewing read-only. Applying the explained move uses milestone 5's explicit action.
- Choose a useful supported move from the current state without using the stored solution as its explanation. Handle contradictory boards and unsupported positions explicitly.
- Retire a hint when the board changes so the next request cannot show stale reasoning.

**Completion criteria:** Early hints do not expose later details through highlights or accessible labels. Every full explanation corresponds to a valid step. “No supported hint found” is distinct from “No move exists.” Opening and dismissing help preserves game state and history.

## 7. Difficulty and practice

**Player benefit:** Choose an appropriate challenge and practice a selected technique.

Deliver in two releases:

1. **Technique grading:** Run an explainable logical solve trace during puzzle evaluation. Label supported puzzles by required techniques and calibrate difficulty with solving effort and playtesting. Retain uniqueness checks. Identify puzzles the supported solver cannot grade.
2. **Targeted practice:** Offer puzzles that require a selected technique along the supported solving path. Begin with small curated or validated sets before adding bounded generation in the puzzle worker.

**Completion criteria:** Labels agree with reproducible solve traces. A practice puzzle requires a useful instance of the selected technique; merely containing a recognizable pattern is insufficient. Generation stays responsive and has a fallback when constraints cannot be met. The existing clue-count labels are replaced only after calibration.

## Very low priority: desktop experience

**Player benefit:** Make desktop feel intentionally designed for a larger screen, with comfortable mouse and keyboard play.

- Revisit board sizing, spacing, control placement and Settings presentation for desktop, rather than simply enlarging the phone layout.
- Review keyboard navigation, focus states, shortcuts and pointer interactions together.
- Preserve the mobile experience and shared game behavior. Explore three desktop renderings when this work is scheduled.

**Priority:** Very low. Keep behind the gameplay, input, recovery and assistance work above; do not let it delay those milestones.

**Completion criteria:** The desktop layout uses available space deliberately, controls are easy to reach, and keyboard and mouse play feel consistent across common window sizes.

## Polish throughout delivery

- Keep actions near the board, touch targets generous, and layout stable during gestures. Show selection count and mode explicitly.
- Offer optional subtle feedback when a hold activates. Haptics depend on device support; the visual cue must work everywhere.
- Hide timer is implemented as a persistent Settings preference. It changes display only; pause, elapsed time, save/reload and restart behavior remain unchanged.
- Respect reduced motion, support keyboard and assistive navigation, and distinguish notes and exclusions through more than color.
- Verify affected interactions on narrow phones and desktop, in both themes, with saved-game recovery. Use physical iOS/Safari checks for gesture changes before treating them as fully verified.
- Keep progress local and offline. Evaluate friction through observed play and user feedback without introducing analytics as a prerequisite.

## Assistance boundaries

Unrestricted deduction chaining previously reduced 86 of 100 sampled Hard puzzles to one candidate per empty cell before the first move. See the [manual-notes investigation](investigations/2026-09-15-manual-notes.md).

This roadmap keeps automatic bookkeeping limited to explicit actions and existing placed-number peer cleanup. Adding notes, opening help, or enabling highlighting must not silently apply a chain of deductions. The September 21 sole-noted-candidate autofill request is a scoped proposal; its evidence and chaining rules must be resolved before implementation. Broader automation preferences remain deferred until single-step assistance is useful and trustworthy.

## Delivery discipline

Digit focus and batch exclusions are complete. PR #12 shipped immediate dragging and title/Settings cleanup; #13 shipped filled-cell exit from batch selection; #14 shipped the optional constrained number picker; #15 shipped compact annotation controls. Follow-ups include temporary note preview and unit-completion animations; recovery and speed replay retain their dependencies. The September 21 playtest adds default digit focus, number-row focus selection, clearer incorrect-entry feedback, exclusion highlighting and optional sole-candidate autofill. Its seven research spikes must produce reviewed scope proposals before their feature outcomes enter the implementation sequence. CI merge gates are already active. Each feature starts with three rendered design directions for Sean to review, followed by a detailed implementation plan and a focused PR. Sean may change the order or skip renderings explicitly. This roadmap does not authorize implementing every phase at once. Update milestone status and links as changes merge.
