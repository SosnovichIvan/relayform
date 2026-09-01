## ADDED Requirements

### Requirement: Implementation handoff
The repository MUST contain distinct frontend and backend implementation task documents before application coding begins.

#### Scenario: Team starts the first implementation iteration
- **WHEN** a frontend or backend engineer selects work
- **THEN** the relevant document identifies scope, dependency, API/data contract, acceptance criteria and verification work

### Requirement: SDD bootstrap
The repository MUST contain an initial SDD specification that captures the shared API, state and FSD boundaries required by the first implementation iteration.

#### Scenario: Scope changes before coding
- **WHEN** a first-iteration behavior changes
- **THEN** the team updates the SDD and relevant OpenSpec change before implementation
