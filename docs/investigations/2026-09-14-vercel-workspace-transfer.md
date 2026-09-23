# Vercel workspace transfer

## Context
The repository was linked to `seanoliver-7160s-projects`, but Sean's intended personal workspace is Cabin 9 (`cabin-9`). Sean requested moving Sudoku there.

## Key findings
- The CLI is signed in to a different Vercel account, which can access `seanoliver-7160s-projects`.
- The connected Vercel app can access Cabin 9, team `team_zbOQcoGZ8Edz3hYHUC0mHa3t`.
- Sudoku is project `prj_ZvtqGcLsOIhWF59NxNzNDZEg3vS5` in `seanoliver-7160s-projects`.
- Cabin 9 has no project named sudoku at the time of checking.

## How it works
Vercel's claim-deployment flow supports transfer between separate accounts. A transfer request was created using the source CLI account, and the claim page was opened in Sean's browser. The destination account must accept the request and select Cabin 9.

## Gotchas
- CLI authentication and the connected Vercel app use different account access. Verify the intended team ID before deploying.
- POST transfer-request requires an application/json request body, even when no optional fields are needed.
- Transfer codes expire after 24 hours. Keep claim URLs out of repository records.
- The browser automation session is signed out of Vercel, so it cannot accept for Cabin 9.

## Verification
Sean accepted the transfer. The Cabin 9 connector confirms the same project ID now belongs to `team_zbOQcoGZ8Edz3hYHUC0mHa3t`, with production deployment `dpl_7SbRchCAhxPohyAYRtghdLiEcSac` READY. The public URL remains https://sudoku-three-liard.vercel.app and returns HTTP 200. Updated `.vercel/project.json` to the Cabin 9 team ID.

The CLI is still authenticated to the previous account, whose teams exclude Cabin 9. Future CLI deployments require signing in to the Cabin 9 account; the connected Vercel app already has destination access.

## References
- https://vercel.com/docs/deployments/claim-deployments
- https://vercel.com/docs/rest-api/projects/create-project-transfer-request
- https://vercel.com/docs/projects/transferring-projects
