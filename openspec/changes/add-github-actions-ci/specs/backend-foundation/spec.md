## ADDED Requirements

### Requirement: Repository continuous integration

GitHub MUST run the project's mandatory quality gates before changes can be accepted into `main`.

#### Scenario: Pull request or main push is created
- **WHEN** GitHub receives a pull request or push to `main`
- **THEN** independent frontend, backend and deployment-configuration jobs run
- **AND** superseded runs for the same workflow/ref are cancelled.

#### Scenario: Coverage regresses
- **WHEN** any configured statement, branch, function or line metric falls below 90%
- **THEN** the relevant CI job fails.

#### Scenario: Production configuration is invalid
- **WHEN** the committed Compose model cannot be resolved with safe example env files
- **THEN** the deployment-configuration job fails without starting services or reading production secrets.

### Requirement: Least-privilege CI supply chain

CI MUST execute without write permissions or application secrets and MUST use immutable external action references.

#### Scenario: Workflow receives a token
- **WHEN** a CI job starts
- **THEN** its `GITHUB_TOKEN` has only repository contents read access.

#### Scenario: Workflow uses a GitHub-authored action
- **WHEN** checkout or Node setup executes
- **THEN** the workflow references a verified full commit SHA
- **AND** Dependabot can propose reviewed updates to that reference.
