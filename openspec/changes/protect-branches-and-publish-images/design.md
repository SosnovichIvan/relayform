# Design

## CI and image publication

The existing `CI` workflow remains the only quality gate and runs on every pull request plus pushes to `main` and `develop`. Stable job names remain `Frontend`, `Backend` and `Deployment configuration` for ruleset status checks.

`Publish container images` is triggered only by a successful completed `CI` run whose head branch is `main`. It checks out the exact `workflow_run.head_sha`, authenticates to GHCR with the workflow-scoped `GITHUB_TOKEN` and `packages: write`, builds the committed production Dockerfiles and publishes separate frontend/backend images. The standalone worker reuses the backend image with its worker command. Images receive an immutable commit tag and a moving `main` convenience tag; deployment documentation must prefer the registry digest returned by GHCR.

No repository PAT, VPS credential or application provider token is available to the image workflow. GitHub-authored actions remain pinned to verified full release SHAs and checkout credentials are not persisted.

## Ownership and pull requests

`.github/CODEOWNERS` assigns every path, including the ownership file, to `@SosnovichIvan`. Required code-owner review therefore makes that account the sole valid reviewer for another author's pull request. Stale approvals are dismissed and the last reviewable push must be approved by someone other than its author.

The owner cannot approve their own pull request. The ruleset therefore gives only that user a `pull_request`-mode bypass. It allows an owner-authored PR to merge while preserving the pull-request and audit trail, but does not permit direct, deletion or force-push bypass.

## Remote ruleset

One active repository branch ruleset targets `refs/heads/main` and `refs/heads/develop`. It restricts updates, blocks deletion and non-fast-forward changes, requires a pull request, one code-owner approval, resolved review conversations and current required checks. The only bypass actor is the repository owner in `pull_request` mode. There is no administrator-wide, deploy-key or integration bypass.

The committed JSON is the reproducible source for the GitHub REST API request. Before application, `develop` is created at the current remote `main` commit if it does not exist. Remote state is read back after mutation and compared with the intended branches, rules, checks and bypass mode.
