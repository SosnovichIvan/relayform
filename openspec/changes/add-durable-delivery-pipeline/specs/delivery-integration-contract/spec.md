## ADDED Requirements

### Requirement: Durable sanitized outcome

The worker MUST persist delivered or failed attempt outcomes independently of API process memory while keeping recipient and message content out of status responses.

#### Scenario: Delivery succeeds

- **WHEN** a claimed job returns a provider message identifier
- **THEN** the attempt is durably marked delivered and its job is completed

#### Scenario: Delivery fails

- **WHEN** a claimed transport produces a classified failure
- **THEN** the attempt stores only the stable failure code and retryable flag

#### Scenario: Status after restart

- **WHEN** the API restarts and the owning project requests an existing attempt
- **THEN** the sanitized status is loaded from PostgreSQL
