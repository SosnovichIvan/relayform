# Change: Protect release branches and publish container images

## Why

Relayform CI validates code but protected collaboration and immutable deployment artifacts are not yet enforced. Direct or forced updates to `main` or `develop` could bypass review, and the VPS deployment path still assumes images are built on the server.

## What changes

- Extend CI to cover pushes to both `main` and `develop` while retaining all pull-request checks.
- Add a post-CI workflow that builds the production frontend and backend images from the exact successful `main` commit and publishes them to GHCR.
- Add repository-wide ownership and a pull-request template.
- Commit an auditable GitHub ruleset definition for `main` and `develop`.
- Apply the active ruleset remotely so direct updates, branch deletion and force pushes are blocked, required CI checks pass, and owner review is required.
- Allow the repository owner to bypass review only from a pull request, never through direct or force push.

## Out of scope

- Automatic VPS deployment, production secrets, multi-architecture images, image retention policy and external contributor permissions are not included.
