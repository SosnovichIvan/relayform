# Repository governance and image publication

## Protected refs

`main` and `develop` are controlled by one active GitHub branch ruleset. The ruleset denies deletion and non-fast-forward updates, restricts updates to the repository owner's pull-request-only bypass, requires pull requests, current CI status checks, resolved conversations and owner review. There is no direct-push bypass, including for administrators.

Repository-wide `CODEOWNERS` assigns `@SosnovichIvan` to every path. Owner-authored pull requests cannot be self-approved, so the owner's ruleset bypass is deliberately limited to pull requests: it preserves the PR/audit record while allowing owner-only merge. This bypass can consciously override the PR rules from the GitHub merge UI; it never authorizes direct or forced updates.

## Artifact flow

The CI workflow validates pull requests plus `main` and `develop` integration commits. Only a successful completed CI run on `main` triggers container publication. The publisher checks out the exact successful SHA and uses the ephemeral `GITHUB_TOKEN` to push frontend and backend images to GHCR. The backend image is also the worker artifact.

Immutable `sha-<commit>` tags identify the source commit; production deployment resolves those tags to registry digests. The moving `main` tag is informational and must not be the production lock.

## Security boundary

- CI has only `contents: read`.
- Image publication has only `contents: read` and `packages: write`.
- No workflow receives VPS SSH or Relayform provider credentials at this stage.
- The administration PAT used to apply GitHub rules is an out-of-repository operator credential and is never a workflow secret.
- The canonical ruleset request body is `.github/rulesets/protectedBranches.json`; remote state must be read back after every application.
