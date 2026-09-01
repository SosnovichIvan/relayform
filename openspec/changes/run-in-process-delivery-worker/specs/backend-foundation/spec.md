## ADDED Requirements

### Requirement: In-process MVP worker execution

The single-backend MVP MUST start one delivery worker pass after accepting a unique event and MUST NOT repeat delivery for an idempotent duplicate.

#### Scenario: Unique queued event

- **WHEN** intake creates a new internal delivery job
- **THEN** the API returns `202 queued` and schedules that job for transport dispatch

#### Scenario: Duplicate event

- **WHEN** intake receives the same scoped idempotency key again
- **THEN** it returns the existing attempt without scheduling another transport dispatch
