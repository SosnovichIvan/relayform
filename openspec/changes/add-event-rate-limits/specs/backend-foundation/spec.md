## ADDED Requirements

### Requirement: Project-scoped intake rate limit

The backend MUST limit public event intake independently per authenticated project before creating a delivery attempt.

#### Scenario: Allowance available

- **WHEN** an authenticated project submits an event within its current allowance
- **THEN** the event proceeds to destination validation and idempotent attempt creation

#### Scenario: Allowance exhausted

- **WHEN** an authenticated project exceeds its current allowance
- **THEN** the service returns `429` with `Retry-After` and creates no delivery attempt

#### Scenario: Window rollover

- **WHEN** the current rate-limit window expires
- **THEN** the project receives a fresh allowance
