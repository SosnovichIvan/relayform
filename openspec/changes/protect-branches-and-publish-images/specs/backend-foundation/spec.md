## ADDED Requirements

### Requirement: Protected integration branches

GitHub MUST protect `main` and `develop` from updates that bypass the pull-request audit trail, owner review and mandatory CI.

#### Scenario: A contributor proposes a protected-branch change
- **WHEN** a pull request targets `main` or `develop`
- **THEN** `Frontend`, `Backend` and `Deployment configuration` checks pass against the current target branch
- **AND** the repository owner approves the changed files
- **AND** all review conversations are resolved before merge.

#### Scenario: The repository owner proposes their own change
- **WHEN** the owner opens a pull request targeting `main` or `develop`
- **THEN** the owner may bypass the impossible self-review requirement only from that pull request
- **AND** the merge retains a pull-request audit trail.

#### Scenario: Anyone attempts a direct or destructive update
- **WHEN** any user, including an administrator or repository owner, directly pushes, force pushes or deletes `main` or `develop`
- **THEN** GitHub rejects the operation.

### Requirement: Verified container publication

GitHub MUST publish deployable Relayform images only from a successful CI result for the exact `main` commit.

#### Scenario: Main CI succeeds
- **WHEN** all CI jobs complete successfully for a `main` commit
- **THEN** GitHub builds frontend and backend production Dockerfiles from that exact commit
- **AND** publishes both images to GHCR with an immutable commit tag.

#### Scenario: CI fails or runs for another branch
- **WHEN** CI fails or its head branch is not `main`
- **THEN** no container image is published.

#### Scenario: Publication authenticates
- **WHEN** the image workflow pushes to GHCR
- **THEN** it uses only the ephemeral workflow `GITHUB_TOKEN` with `contents: read` and `packages: write`
- **AND** receives no VPS or provider credentials.
