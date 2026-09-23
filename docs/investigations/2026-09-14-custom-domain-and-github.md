# Custom domain and GitHub deployment connection

## Context
Sean requested `sudoku.seanoliver.dev` and restoring the GitHub connection after moving Sudoku into Cabin 9.

## Key findings
- Porkbun is authoritative for `seanoliver.dev`; no sudoku record existed.
- Vercel supplied a project-specific CNAME target.
- The transferred project had no connected Git repository.
- GitHub main was behind the live CLI deployment by the highlighting and design commits. Those commits were pushed before connecting the repository.

## How it works
- Production project: Cabin 9 / sudoku.
- Public URL: https://sudoku.seanoliver.dev
- Porkbun record: CNAME `sudoku` → `f908c3c1f24cf884.vercel-dns-017.com`, TTL 600.
- Vercel manages the HTTPS certificate and assigns the domain to production deployments.
- Connected repository: `seanoliver/sudoku`. Production tracks `main`, with automatic custom-domain assignment enabled.

## Gotchas
- Browser authentication, CLI authentication, and the connected Vercel app can use different accounts. Check the destination workspace before changing hosting.
- DNS resolved before the TLS certificate was ready. Initial HTTPS checks failed during certificate generation; subsequent checks returned 200.
- Browser storage belongs to each origin. Saved puzzles and settings on the previous vercel.app address do not automatically appear on the custom domain.
- The CLI still uses the old account; GitHub deployment avoids needing that CLI account for production updates.

## Verification
- Porkbun authoritative DNS and public DNS resolve the expected CNAME.
- HTTPS returns 200 with the Sudoku page title.
- Vercel UI confirms `seanoliver/sudoku` connected and production branch `main`.
- Pushing commit `06ded60` triggered production deployment `dpl_EdkQ7XdR5oZkvi6aifHZ54D8jC5u` in Cabin 9. The deployment reached READY with source `git`, target `production`, and `sudoku.seanoliver.dev` assigned without alias errors.

## References
- https://vercel.com/cabin-9/sudoku/settings/domains
- https://vercel.com/cabin-9/sudoku/settings/git
- https://vercel.com/cabin-9/sudoku/settings/environments/production
- https://github.com/seanoliver/sudoku
