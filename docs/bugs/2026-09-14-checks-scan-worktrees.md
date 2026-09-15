# Development checks scan nested worktrees

## Symptom
`pnpm lint` reported 412 errors and 9,822 warnings, largely in generated files under `.worktrees/`.

## Root cause
ESLint's flat configuration does not inherit `.gitignore`. Its `.next/**` exclusion only covered the root build directory. TypeScript also lacked an explicit worktree exclusion.

## Reproduction
Create a worktree under `.worktrees/`, build or run Next.js there, then run `pnpm lint` from the root checkout.

## Fix
Exclude `.worktrees/**` in ESLint and `.worktrees` in TypeScript so each checkout checks its own files.

## Verification
With the existing nested worktrees still present, lint, typecheck, all 14 unit tests, and the production build pass.

## Recurrence guardrail
Keep nested checkout exclusions in both configurations. Git ignore rules alone do not define lint or compiler scope.
