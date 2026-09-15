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

- Select a cell, then a number. Starting numbers cannot be changed.
- Notes toggles pencil marks. Entering a number removes that note from related cells.
- Undo restores the previous number and note state (up to 200 actions).
- Pause hides the board and stops the clock. The clock also pauses in dialogs and background tabs.
- Progress saves automatically on this device, including undo history.
- Choose a new easy, medium, or hard puzzle. Each generated puzzle has exactly one solution.
- Settings include system/light/dark appearance, conflict marking, and related-cell highlighting.

Keyboard: arrow keys move, 1–9 enter, N toggles notes, Backspace/Delete erases, and Cmd/Ctrl+Z undoes.

## Install

Use HTTPS on a hosted deployment (localhost is suitable for development). Visit once online and wait for “Ready to play offline.” On iOS, use Safari → Share → Add to Home Screen. Supported Android and desktop browsers offer their own installation UI; the app also handles the install prompt when available. A LAN HTTP address on a physical phone does not provide the secure context required for service workers.

No account, backend, analytics, advertising, or external font requests. Clearing browser data removes saved progress. Browser storage may be evicted by the operating system. Multiple tabs do not synchronize games; use one active tab per device.

## Hosting

Production is hosted in the Vercel **Cabin 9** workspace, project `sudoku`. The connected GitHub repository is `seanoliver/sudoku`; pushes to `main` trigger production deployments and automatically assign `sudoku.seanoliver.dev`.

Pushes to other branches automatically create Vercel preview deployments. Open a pull request to see its preview URL in the Vercel bot comment and deployment status; subsequent pushes update the preview. This uses Vercel's GitHub integration and requires no GitHub Actions workflow or deployment token. Pull requests from forks may require approval in Vercel before deployment.

Porkbun manages DNS. The `sudoku` CNAME points to `f908c3c1f24cf884.vercel-dns-017.com` with a 600-second TTL. Vercel manages HTTPS.

Before deploying through the CLI, verify that its signed-in account can access Cabin 9. The repository link alone does not change CLI authentication.

## Development

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
