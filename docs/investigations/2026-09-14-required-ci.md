# Required pull request CI

## Context
PRs need automated checks enforced before merging into production's `main` branch.

## Key findings
- The repository had no Actions workflows, rulesets, or branch protection.
- Existing scripts cover lint, TypeScript, 14 unit tests, and production build with service-worker generation.
- The authenticated GitHub account has repository administration access.

## How it works
`.github/workflows/ci.yml` runs one `CI` job on every PR, pushes to `main`, and manual dispatch. It uses Node 22, pnpm from `packageManager`, frozen dependency installation, a pnpm store cache, read-only repository permissions, pinned action commits, and a 15-minute timeout. A failed step fails the job. Superseded runs are cancelled.

`.github/main-ruleset.json` records the GitHub ruleset configuration: require PRs, require `CI` from the GitHub Actions app (15368) against current `main`, block deletion and force pushes, and permit no bypass actors. No reviewer approval is required for this solo project. The JSON is a configuration snapshot; editing it does not automatically update GitHub.

## Gotchas
- Keep the required status context and workflow job name synchronized.
- Do not add path filters: a skipped workflow leaves required checks pending.
- The workflow runs on PR merge commits, including the PR that introduces it.
- Browser interactions and offline behavior are not covered by this initial suite.
- Local nested worktrees must be excluded from lint and TypeScript scans.

## Verification
Locally, lint, typecheck, all 14 tests, and production build passed on Node 24.20.0. GitHub CI provides verification on Node 22 and a clean Linux checkout.

## References
- [Workflow](../../.github/workflows/ci.yml)
- [Ruleset configuration](../../.github/main-ruleset.json)
- [GitHub rules API](https://docs.github.com/en/rest/repos/rules#create-a-repository-ruleset)
- [Required status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
