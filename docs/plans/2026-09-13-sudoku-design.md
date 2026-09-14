# Sudoku design

Approved scope: a free, mobile-first Next.js Sudoku PWA, inspired by the calm and responsiveness of Things 3. No accounts, ads, analytics, paid features, or backend.

## Interaction and visual direction

System UI typography with tabular puzzle digits. Paper white #ffffff, canvas #f5f6f8, ink #273246, secondary #687487, blue #2878e8, selection #dceaff. Center a maximum 450px game surface; a small app bar sits above it. Board remains visually dominant. Subtle surface shadows belong to controls, not every container. Mobile uses safe-area padding and compact vertical spacing. Keep ordinary taps immediate; animate only opacity and transforms for sheets, selection feedback, and completion. Respect reduced motion and system dark appearance.

App bar: app identity, install action, settings. Game: title, difficulty/new game, elapsed time/pause, 9×9 board, undo/erase/notes, number pad. Native dialog sheets provide new-game confirmation, instructions, settings, and installation guidance. Keyboard input includes arrows, digits, Backspace, N, and Cmd/Ctrl+Z. Completion stays visible on the game screen.

## Architecture

Next.js App Router serves a static page with a client game. A pure TypeScript engine generates uniquely solvable boards in a Web Worker. Generation removes clues only while uniqueness holds; difficulty is initially based on clue count, not a formal human-strategy rating. Pure game transitions preserve givens, clean peer notes, and maintain undo history. Versioned localStorage validates data before restoring. The clock pauses when hidden or a dialog is open.

Build generates a versioned service worker precaching the app shell and all Next static assets, including the puzzle worker. First successful online installation enables offline navigation and new puzzle generation. No runtime network is needed for gameplay. PWA includes real PNG icons, maskable icon, manifest, standalone mode, and iOS install guidance. Updates activate at a later launch rather than interrupting a puzzle.

## Verification

Unit tests: unique solutions for all difficulties, Sudoku validity, input immutability, givens, note cleanup/undo, completion, corrupt-save rejection. Production build/typecheck/lint. Browser QA at phone and desktop sizes: number entry, notes, undo, reload persistence, dialogs/focus, pause, new-game cancellation, offline reload and generation, console errors. Actual iOS installation and physical-device feel remain device checks.
