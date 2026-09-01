## 1. GitHub Actions

- [x] 1.1 Run CI for pull requests and pushes to both protected branches.
- [x] 1.2 Add a least-privilege post-CI workflow publishing frontend/backend production images to GHCR.
- [x] 1.3 Tag images by exact commit and document digest-based VPS consumption.

## 2. Repository governance

- [x] 2.1 Add repository-wide owner review and a pull-request checklist.
- [x] 2.2 Commit an auditable ruleset definition for `main` and `develop`.
- [x] 2.3 Create `develop` from remote `main` when absent and apply the active ruleset through GitHub API.
- [x] 2.4 Read back and verify the active remote protection and bypass boundary.

## 3. Documentation and validation

- [x] 3.1 Document protected-branch behavior, image names and token boundaries.
- [x] 3.2 Validate workflow/ruleset syntax and run mandatory repository quality gates.
- [x] 3.3 Update persistent project context and pass strict OpenSpec validation.
