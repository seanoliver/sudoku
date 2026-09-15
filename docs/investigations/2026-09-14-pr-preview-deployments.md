# Pull request preview deployments

## Context
Verify automatic Vercel previews for pull requests after connecting the transferred project to GitHub.

## Key findings
- Cabin 9 / sudoku already has the required GitHub integration enabled for `seanoliver/sudoku`.
- Production tracks `main`; Preview tracks all unassigned Git branches.
- Pull Request Comments and Commit Status are enabled.
- No additional workflow, deployment token, or Vercel setting change is needed.

## How it works
Pushing a non-production branch starts a preview build. Vercel posts a preview link on the pull request and reports deployment status on the commit. Subsequent pushes update the branch preview URL.

## Gotchas
- The local Vercel CLI uses the previous account and cannot access Cabin 9. Use the connected GitHub workflow.
- Fork pull requests may require Vercel authorization before deployment.

## Verification
- Confirmed branch tracking and Git integration settings in the Vercel dashboard.
- Pushed documentation commit `53b50dc` on `docs/verify-pr-previews` and opened draft PR #1.
- Vercel automatically created Git-sourced preview deployment `dpl_G8cWZFWFarvnWfzc6qNi48PR5p9r`, associated it with PR #1, and posted its preview URL in a bot comment.
- `git diff --check` passed.

## References
- https://github.com/seanoliver/sudoku/pull/1
- https://vercel.com/cabin-9/sudoku/settings/git
- https://vercel.com/cabin-9/sudoku/settings/environments
- https://vercel.com/docs/git/vercel-for-github
