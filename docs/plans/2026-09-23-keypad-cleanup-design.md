# Keypad cleanup after playtest

Sean's September 23 phone playtest of the entry mode switch asked for four changes. He specified each one, so no design directions were rendered.

## Changes

- **Annotation digits in cell position.** In Notes and Exclude, each number key becomes a 3 × 3 grid and its small digit sits where that note appears in a cell: 1 top left, 2 top center, 3 top right, through 9 bottom right. Exclude digits keep the red strike.
- **No batch panel.** The bordered "N cells selected" panel and its Clear selection button are removed, so the number row stays in the same position during a batch. A visually hidden live region still announces the count. Escape, selecting a filled cell, and choosing Numbers still end a batch.
- **No hint line.** The text under the number row is removed in every state.
- **No footer.** The footer's offline status ("Ready to play offline" or "Free to play. No ads.") and its How to play link are removed. How to play moves into Settings, where it opens the same help sheet.

- **Filter number keys covers annotations.** With Filter number keys on, digits already in the selected cell's row, column, or box are dimmed and refused in Notes and Exclude too, with the same gray style as in Numbers. Removing an existing note or exclusion of such a digit is still allowed. During a batch, a digit is dimmed only when every selected cell refuses it; otherwise it applies to the cells that allow it. This reverses the original number-filter design, which left annotations unrestricted (Sean, September 23).
- **Annotation digits stay readable.** Key digits in Notes and Exclude are 13px with a 1.5px strike for exclusions.

## Roadmap

Adds R9, a native iOS app, as a later goal once the web app is settled.
