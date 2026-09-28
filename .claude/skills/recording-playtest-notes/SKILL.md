---
name: recording-playtest-notes
description: Use when Sean pastes notes, complaints, or ideas from playing the Sudoku app (on his phone, a train, "played a few games"), or a list of feedback items to log, sort, or add to the roadmap.
---

# Recording playtest notes

Record the notes verbatim, sort every item against the code and roadmap, and file it. Intake records and sorts; it does not fix anything.

## Steps

1. **Read first:** `docs/playtests/` (latest file for format), `docs/ROADMAP.md` headings (`grep -n '^#' docs/ROADMAP.md`), and the highest `R<n>` number in use. Numbers are not in heading order; take the max and add one.
2. **Check each item against current code.** Run `git fetch` and read `origin/main` (local `main` is often behind), and run `gh pr list` for open work. Several "requests" already exist, already work, or sit in an open PR. Cite `file:line` or the PR.
3. **Check for an existing roadmap entry.** If it is still open, add the new detail to it. If it shipped, make a new entry in step 6 that links to it. Never add a duplicate of an open entry.
4. **Sort each item** into exactly one type:

| Type | Meaning | Next step |
| --- | --- | --- |
| Bug | Existing behavior is wrong | Reproduce, fix in its own PR, bug journal entry |
| Needs repro | Code suggests it already works | Ask Sean one specific question |
| Copy or polish | Small, no design choice | Fix in its own PR |
| Feature | New visible UI | Three design directions first |
| Research | Open question with trade-offs | New `R<n>` entry, scope comes back to Sean |
| Already built | Shipped or in an open PR | Point Sean to it; no roadmap entry |

5. **Write `docs/playtests/YYYY-MM-DD.md`**, dated the day he played (the section heading in step 6 uses the same date). The Type column is newer than `2026-09-21.md`; keep it.

```markdown
# <Month D, YYYY> playtest

Recorded: <today>.

<One sentence: where tracked, linking ../ROADMAP.md.>

## Original notes

<Sean's text, verbatim, including typos.>

## Roadmap coverage

| Original item | Type | Roadmap entry |
| --- | --- | --- |
```

6. **Edit `docs/ROADMAP.md`:** bump "Updated:"; add a `## <Month D> additions` section for bugs, needs-repro, polish, and features (each `###` with Observation, Status, Completion criteria); add research items as `### R<n>. <Title>` with Observation or Idea, Research, Output, placed at the end of the research block (just before `## 1. Digit locking`; R11 sits under the Learn milestone); add anchors to the coverage table. If an open PR also edits `ROADMAP.md` (`gh pr diff <n> --name-only`), tell Sean the two will conflict.
7. **Reply** with the output format below. Do not start fixes in the same turn.

## Output

- Files written.
- One line per item: type, and the next action or the question for Sean.
- One recommended first item to work on.

## Out of scope

- Fixing bugs or building features (separate PRs).
- Rendering design directions (rendering-design-directions).
- Reordering the roadmap's milestone sequence without Sean.
