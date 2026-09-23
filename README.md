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

- Select an empty cell, then a number to enter it. With a filled cell selected, the number row and digit keys focus that digit without replacing the value. Use Erase before entering a replacement. Starting numbers cannot be changed.
- Notes (N) switches between number entry and annotations. While Notes is on, the compact Exclude chip (X) toggles crossed-out digits and removes those cells from Smart highlighting for that digit. Turning Notes off also exits batch selection.
- Erase appears only for a selected user-entered number or annotations and clears that cell. It stays hidden for givens, empty cells, and batch selections.
- Fill notes in Settings replaces notes in every empty cell with all candidates allowed by placed numbers, preserving crossed-out exclusions and omitting those digits. Generated notes are blue. One undo restores the previous annotations. Entering a number removes matching peer notes.
- Deduction detection is retained for future hints and does not change notes or highlighting.
- Undo and Redo in Settings restore values, notes and exclusions (up to 200 actions total). Both persist across reopening. A new edit clears Redo. Use ⌘/Ctrl+Z to undo and ⌘/Ctrl+Shift+Z to redo, including the final placement.
- Pause hides the board and stops the clock. The clock also pauses in dialogs and background tabs. Hide timer in Settings hides the time display while elapsed time continues to be tracked and saved.
- Progress saves automatically on this device, including undo history.
- Choose a new easy, medium, or hard puzzle. Each generated puzzle has exactly one solution.
- Settings include system/light/dark appearance, Block incorrect answers, related-cell highlighting, and optional Filter number keys. Filtering dims numbers already in the selected cell’s row, column, or box and rejects matching keyboard input. It starts off, ignores notes/exclusions and the solution, and leaves all annotation modes unrestricted.

Keyboard: arrow keys move, 1–9 enter, N toggles notes, X toggles exclusions while Notes is on, Backspace/Delete erases, and Cmd/Ctrl+Z undoes.

## Install

Use HTTPS on a hosted deployment (localhost is suitable for development). Visit once online and wait for “Ready to play offline.” On iOS, use Safari → Share → Add to Home Screen. Supported Android and desktop browsers offer their own installation UI; the app also handles the install prompt when available. A LAN HTTP address on a physical phone does not provide the secure context required for service workers.

No account, backend, analytics, advertising, or external font requests. Clearing browser data removes saved progress. Browser storage may be evicted by the operating system. Multiple tabs do not synchronize games; use one active tab per device.

## Hosting

Production is hosted in the Vercel **Cabin 9** workspace, project `sudoku`. The connected GitHub repository is `seanoliver/sudoku`; pushes to `main` trigger production deployments and automatically assign `sudoku.seanoliver.dev`.

Porkbun manages DNS. The `sudoku` CNAME points to `f908c3c1f24cf884.vercel-dns-017.com` with a 600-second TTL. Vercel manages HTTPS.

Before deploying through the CLI, verify that its signed-in account can access Cabin 9. The repository link alone does not change CLI authentication.

## Roadmap

See the [feature roadmap](docs/ROADMAP.md) for the planned sequence from faster input and recovery to explainable deductions, progressive hints, and technique-based practice.

## Development

Pull requests run the [CI workflow](.github/workflows/ci.yml) on Node 22 with
the pnpm version pinned in `package.json` and a frozen lockfile. The `CI` check
must pass lint, TypeScript checking, unit tests, and the production build
(including service-worker generation). It runs for every PR, including docs-only
changes, and for pushes to `main`.

The GitHub `main` ruleset requires a pull request and a successful `CI` check
from GitHub Actions against the latest `main`. It also blocks force pushes and
branch deletion, with no bypass actors. Keep the job name `CI` in sync with the
required check in repository settings. Browser and offline behavior still need
manual verification when affected.

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

- `src/lib/sudoku.ts`: seeded generator, peers, conflict detection, MRV uniqueness solver.
- `src/lib/game.ts`: pure game transitions, undo, saved-game validation.
- `src/lib/puzzle.worker.ts`: puzzle generation outside the UI thread.
- `src/components/game.tsx`: accessible grid, number pad, settings and installation sheets.
- `src/components/clock.tsx`: isolated timer updates; no per-second board rerender.
- `scripts/build-sw.mjs`: versioned, atomic precache from the production output.
- `scripts/icons.mjs`: regenerate bundled PNG app icons with `node scripts/icons.mjs`.

Difficulty currently controls clue density (42/34/28 target clues), not a formal human-solving technique rating. Uniqueness always takes priority over the target count. Future work can add technique-based grading and a broader solution-generation distribution.

The service worker keeps a consistent app shell and its assets. Updates wait until existing app tabs are closed, preventing an update from changing a running puzzle. To remove a development cache, unregister the worker and clear this origin’s caches in browser developer tools.

See [design](docs/plans/2026-09-13-sudoku-design.md) and [verification](docs/investigations/2026-09-13-pwa-verification.md).

Implementation references: [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps), [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [MDN service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).
