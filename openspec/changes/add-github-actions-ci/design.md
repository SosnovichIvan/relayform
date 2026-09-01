# Design

## Workflow boundary

`.github/workflows/ci.yml` runs on `pull_request`, pushes to `main` and `workflow_dispatch`. Workflow-level concurrency cancels superseded runs for the same workflow/ref. The `GITHUB_TOKEN` receives only `contents: read`; no job receives repository or provider secrets, writes permissions, deployment environments or `pull_request_target` privileges.

## Jobs

Two independent Node.js 24 jobs install the committed lockfile with `npm ci`. `Frontend` runs root typecheck, lint, coverage and the production Next.js build. `Backend` runs the API workspace typecheck, lint and coverage. Existing Vitest thresholds make statements, branches, functions and lines below 90% fail the jobs.

`Deployment configuration` uses the GitHub-hosted runner's Docker Compose installation and the committed example env files to run `docker compose config --quiet`. It uses a non-secret placeholder PostgreSQL password and exposes no service.

Every job has a timeout. Checkout does not persist credentials. GitHub-authored actions are referenced by verified full release SHAs with their human-readable release tags in same-line comments so Dependabot can update them.

## Maintenance

`.github/dependabot.yml` checks the `github-actions` ecosystem weekly at repository directory `/`. Action updates remain pull requests and therefore run the same CI before merge. Repository settings should require the three stable job names before merging to `main`.
