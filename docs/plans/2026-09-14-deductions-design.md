# Configurable deductions

Sean approved independent Pointing pairs and Hidden pairs toggles with explanations and expandable examples. Both default off. Hidden pairs apply to rows, columns, and boxes; pointing pairs eliminate a digit outside its box along a shared row or column.

A shared candidate calculation starts from placed numbers, runs enabled rules until no candidates change, and supplies both Smart highlighting and Auto notes. Auto notes retain their one-or-two-placements-per-box display threshold. Manual notes remain independent, and no values are filled automatically. Disabling a rule recalculates from the placed numbers, restoring any possibilities no longer eliminated. Reload, erase, undo, and new puzzles follow the same calculation.

Represent each rule with an identifier, title, description, and candidate-elimination function. A registry drives execution and Settings so adding a future rule does not require changing the execution loop. Keep example presentation in a separate component. Store enabled rules in a nested preferences object and restore each known flag independently, defaulting missing or malformed flags to false.

Candidate sets only shrink within a calculation. If entries already conflict, or deductions expose an empty cell or a missing digit with no placement in a house, return the basic candidates instead of propagating contradictions. Never read the stored solution or infer elimination from an absent manual note.

Settings examples show the candidates that establish each pattern and the candidates removed by it, with equivalent text for screen readers. Examples can be opened without enabling the rule. Use existing theme colors and native disclosure controls.

Verify both pointing orientations, all hidden-pair house types, negative examples, rule independence, repeated deduction, reversibility, invalid boards, preference migration, and preservation of solution candidates across generated puzzles. Browser checks cover shared notes/highlights, toggles, reload, examples, keyboard use, and mobile light/dark layouts.
