# App icon

Roadmap item: R9, part of the Sudoclue rebrand before TestFlight. On October 10 Sean asked for a nicer icon than the blue four-square mark. He chose direction A (lit cell) from three options (lit cell, magnifier, candidate notes; ../designs/app-icon-directions.png), then the Midnight color scheme from four (Midnight, Ink, Teal, Plum) because blue felt generic. Reference: ../designs/app-icon-approved.png.

## Mark

- A 3×3 grid of rounded cells on a deep indigo gradient (`#3b3f8f` → `#232663` → `#15173d`).
- Eight cells are pale lavender at low opacity. The center cell is amber `#ffc94d`, the hint color, with a soft glow.
- The app's buttons and highlights stay blue. Changing the accent color is a separate decision.

## Files

- `scripts/icons.mjs` draws the mark and writes `public/icon.svg`, the PNGs, the maskable icon (grid at 80% for the safe zone), the iOS app icon, and the iOS splash images.
- `.app-mark` in `globals.css` draws the same mark in CSS for the header, the loading state, and the install sheet.
