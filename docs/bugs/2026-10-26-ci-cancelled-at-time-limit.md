# CI cancelled at its 20-minute limit

## Symptom

From 2026-10-26, the single `CI` job was cancelled at its 20-minute limit on most runs: both `main` runs after #128 and #127 merged, and every run of #131. No test failed. The job ended on "Install Playwright browsers" or partway through "Browser tests".

## Root cause

Two slow steps shared one 20-minute job.

- `playwright install --with-deps chromium webkit` first installs about 120 Ubuntu packages through apt from `azure.archive.ubuntu.com`. That mirror stalled: one run fetched 50 packages in 16 minutes, and a later run spent 28 minutes without starting the browser download. Install times ranged from 30 seconds to over 28 minutes.
- About 820 browser tests (Chromium, WebKit, and the two motion projects) ran with Playwright's CI default of half the runner's cores, 2 workers on a 4-core runner. They took 14 to 18 minutes.

A fast mirror left about 2 minutes to spare. A slow one cancelled the run.

## Reproduction

Push to any branch with the workflow at `8908574` and watch the step times. Runs 40349759292 (three attempts) and 40368886694 show the stalled apt step; run 40266843476 shows the test step running past the limit.

## Fix

#133 split the workflow into three jobs:

- `checks`: lint, typecheck, unit tests, build, and the iOS export.
- `e2e`: the browser tests inside `mcr.microsoft.com/playwright:v1.63.0-noble`, which ships the browsers and their packages, split with `--shard=N/4`.
- `CI`: runs with `if: always()` and passes only when both other jobs succeeded, so the ruleset's required `CI` check keeps working.

A first attempt that raised the limit to 30 minutes and cached the browsers did not help, because a cache hit still runs apt for the system packages.

## Verification

Run 40380013390 on #133: `checks` took 2m07s and the shards took 3m13s to 8m15s, about 8m20s in total. The shards ran 211, 207, 202, and 200 tests, the same 820 as one job.

## Recurrence guardrail

- The image tag must equal `@playwright/test` in `package.json`. A mismatch makes Playwright look for browser builds the image does not have. Bump both together.
- Every job has a 15-minute limit, so a stall fails fast instead of using 30 minutes.
- If a shard nears its limit, add a shard before raising the limit.
