# Sudoku repository guidance

## UI design principle: show, don't explain

- Communicate state and feedback visually wherever possible: color, shape, icons, motion, position, and disabled or highlighted states. Treat explanatory text as a last resort.
- Before adding or keeping UI text, check whether a visual indicator can carry the same meaning. If it can, use the indicator and remove the text.
- Text is justified only for things a player cannot infer from the board, such as how an advanced deduction works or what a complex setting changes. Keep that text short.
- Visual indicators must still be accessible. Pair color with a second cue (shape, icon, pattern, or motion), provide `aria-label` or live-region announcements for assistive technology, and respect reduced motion. Accessible names are not visible UI text and do not count against this principle.

## Feature design workflow

- Before implementing a new feature, render three distinct design directions in the real app and wait for Sean to choose one. Sean may explicitly skip or adjust this.
- Procedure: `.claude/skills/rendering-design-directions/SKILL.md`.

## Skills

Repository workflows live in `.claude/skills/`. Read the matching `SKILL.md` before starting:

- `capturing-share-screenshots`: phone screenshots for posts, PRs, and docs (390 × 844, equal 17px margins, saved in `docs/screenshots/`).
- `rendering-design-directions`: three directions before a feature.
- `adding-a-solving-technique`: a new deduction through solver, hints, and Learn.
- `recording-playtest-notes`: Sean's playtest feedback into `docs/playtests/` and the roadmap.
- `syncing-docs`: bring README, ROADMAP, AGENTS.md, and skills in line with the app.

## iOS app

- The iPhone app is a Capacitor wrapper around a static export of the same code. `pnpm build` builds the website; `pnpm build:ios` exports to `out/` and syncs it into `ios/`. Open `ios/App/App.xcodeproj` in Xcode to run it on a device.
- Code that should exist only in the app checks `process.env.NEXT_PUBLIC_BUILD_TARGET === 'ios'`, so the website's bundle leaves it out.
- Capacitor 8's `SceneDelegate` creates the root view controller in code. Native changes go in `MainViewController`, which `SceneDelegate` uses.
- `ProgressStore` in `MainViewController.swift` copies every `localStorage` key that starts with `sudoku.` to files in Application Support and puts back any the web view lost. Keep new storage keys under that prefix and to letters, digits, `.`, `-`, and `_`, or the app can lose them when iOS clears web storage.
- Background: `docs/investigations/2026-10-09-ios-wrapper.md`.

## Deployment

- Production URL: `https://sudoku.seanoliver.dev`.
- Vercel workspace: **Cabin 9** (`cabin-9`, team `team_zbOQcoGZ8Edz3hYHUC0mHa3t`), project `sudoku` (`prj_ZvtqGcLsOIhWF59NxNzNDZEg3vS5`).
- GitHub repository: `seanoliver/sudoku`. Production tracks `main`. Prefer the connected GitHub deployment workflow.
- Verify both the project link and authenticated account before CLI deployments. The CLI previously used another account; never infer workspace ownership from the project name alone.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
