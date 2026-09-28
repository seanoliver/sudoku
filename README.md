# Sudoku

[Play Sudoku](https://sudoku.seanoliver.dev)

A small, free, mobile-friendly Sudoku PWA built with Next.js, React, and TypeScript. Things 3 inspired the restrained colors, system typography, controls, and interaction style.

## Run

Requires Node 22+ and pnpm 10.

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000. To use offline play and installation, run the production build:

```sh
pnpm build
pnpm start
```

The build generates `public/sw.js` after Next.js finishes, precaching the complete app and puzzle worker. Always use `pnpm build`, rather than calling `next build` alone. Test production and development on different ports; an installed production service worker intentionally retains its matching app shell until all its tabs are closed.

## Play

- The app opens on Home: continue the puzzle in progress, start an Easy, Medium, Hard or Expert puzzle, open the next lesson, or browse all techniques. Home also shows how many puzzles you have solved and, until the app is installed, an install card. The Home button or the browser's back button returns there from a game.
- Select an empty cell, then a number to enter it. With a filled cell selected, the number row and digit keys focus that digit without replacing the value. Starting numbers cannot be changed. With Block incorrect answers on, a wrong number is refused and shown struck through in red.
- The Numbers | Notes | Exclude control switches what the number keys do. Notes add or remove pencil marks; Exclude crosses out digits and removes those cells from Smart highlighting for that digit.
- Drag across empty cells, or hold one, to select several. A number then toggles that note or exclusion in every selected cell. Tap a filled cell or press Escape to finish.
- Erase clears your number or annotations from the selected cell. It stays visible and dims when there is nothing to erase.
- Fill notes in Settings replaces notes in every empty cell with all candidates allowed by placed numbers, keeping crossed-out exclusions. Generated notes are blue. One undo restores the previous annotations. Entering a number removes matching notes and exclusions from related cells.
- The bulb opens a hint. Each tap reveals more: the technique, where to look, then a step-by-step walkthrough of why the move works, ending with Apply. The walkthrough links to that technique's lesson.
- Learn has a lesson for each technique the solver uses: watch it on an example board, then find it on practice boards. Finished lessons are marked learned on this device.
- Completing a row, column or box plays a short green sweep.
- Undo and Redo in Settings restore values, notes and exclusions (up to 200 actions total). Both persist across reopening. A new edit clears Redo. Settings also has New puzzle and Restart puzzle.
- Pause hides the board and stops the clock. The clock also pauses in dialogs and background tabs. Hide timer in Settings hides the time display while elapsed time continues to be tracked and saved.
- Progress saves automatically on this device, including undo history.
- Levels are graded by the hardest technique a puzzle needs. Every generated puzzle has exactly one solution. Expert puzzles come from a precomputed bank and do not repeat until you have seen them all.
- Settings include system/light/dark appearance, Block incorrect answers, Highlight related cells, Smart highlighting, Filter number keys and Hide timer. New players start with every aid on except Hide timer. Filter number keys dims numbers already in the selected cell’s row, column, or box; tapping or typing a dimmed number focuses it instead of entering it.

Keyboard: arrow keys move, 1–9 enter, N switches to Notes and X to Exclude (press again for Numbers), H shows a hint, Escape closes a hint or ends a selection, Backspace/Delete erases, Cmd/Ctrl+Z undoes, and Cmd/Ctrl+Shift+Z redoes.

## Install

Use HTTPS on a hosted deployment (localhost is suitable for development). Visit once online. The install card on Home, or Install app in the game's top bar, opens the Install sheet, which says when offline play is ready. On iOS, use Safari → Share → Add to Home Screen. Supported Android and desktop browsers offer their own installation UI; the app also handles the install prompt when available. A LAN HTTP address on a physical phone does not provide the secure context required for service workers.

No account, backend, analytics, advertising, or external font requests. Clearing browser data removes saved progress. Browser storage may be evicted by the operating system. Multiple tabs do not synchronize games; use one active tab per device.

## Hosting

Production is hosted in the Vercel **Cabin 9** workspace, project `sudoku`. The connected GitHub repository is `seanoliver/sudoku`; pushes to `main` trigger production deployments and automatically assign `sudoku.seanoliver.dev`.

Porkbun manages DNS. The `sudoku` CNAME points to `f908c3c1f24cf884.vercel-dns-017.com` with a 600-second TTL. Vercel manages HTTPS.

Before deploying through the CLI, verify that its signed-in account can access Cabin 9. The repository link alone does not change CLI authentication.

## Roadmap

See the [feature roadmap](docs/ROADMAP.md) for what has shipped and what comes next: recovery checkpoints, chosen deductions, and the open research items.

## Development

Pull requests run the [CI workflow](.github/workflows/ci.yml) on Node 22 with
the pnpm version pinned in `package.json` and a frozen lockfile. The `CI` check
must pass lint, TypeScript checking, unit tests, the production build
(including service-worker generation), and Playwright browser tests in Chromium
and WebKit at phone size. It runs for every PR, including docs-only
changes, and for pushes to `main`.

The GitHub `main` ruleset requires a pull request and a successful `CI` check
from GitHub Actions against the latest `main`. It also blocks force pushes and
branch deletion, with no bypass actors. Keep the job name `CI` in sync with the
required check in repository settings. Offline behavior and physical-device gestures still
need manual verification when affected.

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm test:e2e
```

- `src/lib/sudoku.ts`: seeded generator, peers, conflict detection, MRV uniqueness solver.
- `src/lib/game.ts`: pure game transitions, undo, saved-game validation.
- `src/lib/steps.ts`: human solving techniques as steps; `difficulty.ts` grades puzzles by the hardest one needed.
- `src/lib/hints.ts`, `hint-view.ts`, `explain.ts`: next hint, its strip text, and the step-by-step walkthrough.
- `src/lib/lessons.ts`: lessons and practice-board grading.
- `src/lib/expert-bank.ts`, `lesson-bank.ts`: generated by `pnpm build:expert-bank` and `pnpm build:lesson-bank`.
- `src/lib/puzzle.worker.ts`: puzzle generation outside the UI thread.
- `src/components/game.tsx`: accessible grid, number pad, hints, settings and installation sheets.
- `src/components/home.tsx`, `learn-page.tsx`, `lesson.tsx`: Home, the lesson list, and a lesson.
- `src/components/clock.tsx`: isolated timer updates; no per-second board rerender.
- `scripts/build-sw.mjs`: versioned, atomic precache from the production output.
- `scripts/icons.mjs`: regenerate bundled PNG app icons with `node scripts/icons.mjs`.
- `scripts/build-share-image.mjs`: regenerate the link preview image with `pnpm build:share-image`.

Difficulty is graded by the hardest technique a puzzle needs (`DIFFICULTY_BANDS` in `src/lib/difficulty.ts`): Easy needs only naked singles, Medium hidden singles, Hard locked candidates and pairs, and Expert triples through coloring. Easy and Medium keep clue targets (42/34); Hard removes every removable clue. The generator draws seeded candidates until one rates in the band. Expert comes from the precomputed bank. Uniqueness always takes priority.

The service worker keeps a consistent app shell and its assets. Updates wait until existing app tabs are closed, preventing an update from changing a running puzzle. To remove a development cache, unregister the worker and clear this origin’s caches in browser developer tools.

See [design](docs/plans/2026-09-13-sudoku-design.md) and [verification](docs/investigations/2026-09-13-pwa-verification.md).

Implementation references: [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps), [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [MDN service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).
