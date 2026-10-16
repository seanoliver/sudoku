# E2E tests ran against another worktree's server

## Symptom

While finalizing #107, four `digit-focus.spec.ts` tests failed locally, including the two tests written for that PR's fix. The code was correct. The same tests passed once an unrelated server was stopped.

## Root cause

`playwright.config.ts` served on a fixed port, 3400, with `reuseExistingServer: !process.env.CI`. Locally, Playwright reuses any server that already answers on that port. A `pnpm start` left running in an old agent worktree held 3400 and served the commit before the fix, so the tests ran against old code and reported nothing about it.

The same setting also reused a server from the same checkout after `pnpm build`, which serves the build it started with.

## Reproduction

1. In checkout A, run `pnpm build && pnpm start --port 3400`.
2. In checkout B, with different code, run `pnpm build && pnpm test:e2e`.
3. Checkout B's tests run against checkout A's server.

## Fix

#110:

- The port comes from `E2E_PORT`, or in CI 3400, or locally a hash of the config file's folder (3400 to 4999), so worktrees do not share a port.
- `reuseExistingServer: false` everywhere. A taken port fails with "already used" instead of testing other code.
- An invalid `E2E_PORT` throws.

## Verification

- With a decoy server on the checkout's port, the run failed with "already used".
- With a decoy on 3400, a local run passed on its own port. With `CI=1` it failed with "already used".
- `E2E_PORT=abc` threw. `E2E_PORT=3911` ran on 3911. Running from `e2e/` with `-c` used the same port as the root.
- `digit-focus.spec.ts` passed 21 of 21 on Chromium.

## Recurrence guardrail

Never set `reuseExistingServer: true` for a server whose port another checkout can hold. When e2e results disagree with the code, check what is listening first: `lsof -iTCP:<port> -sTCP:LISTEN`, then the listener's working directory with `lsof -p <pid> -a -d cwd`.
