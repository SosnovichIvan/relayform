# Continuous integration

## Triggers

- Pull requests targeting any branch.
- Pushes to `main`.
- Manual `workflow_dispatch`.

## Required checks

- `Frontend`
- `Backend`
- `Deployment configuration`

Repository branch protection for `main` should require all three names.

## Security contract

- Workflow permissions are limited to `contents: read`.
- No provider, VPS or application secrets are used.
- `pull_request_target` is forbidden for this CI.
- Checkout does not persist credentials.
- External GitHub actions are pinned to verified full commit SHAs with release comments.
- Dependabot reviews the `github-actions` ecosystem weekly.

## Local equivalents

- Frontend: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- Backend: `npm ci`, `npm run typecheck --workspace @relayform/api`, `npm run lint --workspace @relayform/api`, `npm test --workspace @relayform/api`.
- Compose: resolve `dockerCompose.production.yml` with `ops/appEnv.example.env`, `ops/serviceTokens.example.env` and non-secret placeholder runtime variables.
