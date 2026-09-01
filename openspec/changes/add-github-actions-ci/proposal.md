# Change: Add GitHub Actions continuous integration

## Why

Relayform has mandatory local quality gates but GitHub currently does not enforce them on pull requests or `main`. Regressions in frontend, backend, coverage, production build or deployment configuration can therefore be merged without an automated repository check.

## What changes

- Add a least-privilege GitHub Actions workflow for pull requests, pushes to `main` and manual runs.
- Run frontend and backend typecheck, lint and coverage independently on Node.js 24; also build the production Next.js application.
- Validate the production Docker Compose model without loading real credentials.
- Pin GitHub-authored actions to immutable full commit SHAs and let Dependabot propose GitHub Actions updates.
- Document required branch-protection checks and local equivalents.

## Out of scope

- Deployment, publishing images, database integration tests, external coverage services, secrets, preview environments and automatic merging are not included.
