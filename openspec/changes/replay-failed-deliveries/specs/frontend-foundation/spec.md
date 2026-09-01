## ADDED Requirements

### Requirement: Failed delivery replay experience

The cabinet MUST show safe recent failures for the selected project and let the owner retry one without revealing submission content or recipient data.

#### Scenario: Project has final failures
- **WHEN** cabinet project data loads
- **THEN** a responsive section identifies each failure by form, provider, safe reason and time with a compact replay action.

#### Scenario: Replay succeeds
- **WHEN** the owner replays an attempt
- **THEN** only that row shows progress and the cabinet reloads delivery data after success.

#### Scenario: Replay cannot complete
- **WHEN** the backend returns a conflict or retryable failure
- **THEN** the row remains visible and a safe error is shown
- **AND WHEN** authorization is invalid
- **THEN** the user returns to login.
