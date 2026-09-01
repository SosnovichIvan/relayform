## ADDED Requirements

### Requirement: Durable accepted delivery

When PostgreSQL is configured, the backend MUST atomically persist the submission, delivery attempt and claimable job before returning `202 queued`.

#### Scenario: API restarts after acceptance

- **WHEN** the API returns `202` and restarts before transport delivery
- **THEN** the accepted job remains claimable from PostgreSQL

#### Scenario: Duplicate acceptance

- **WHEN** the same project-scoped idempotency key is submitted again
- **THEN** the original attempt is returned and no additional job is created

### Requirement: Leased job claim

The worker MUST claim jobs using an exclusive database lease and MUST allow abandoned jobs to become claimable after lease expiry.

#### Scenario: Concurrent workers

- **WHEN** two workers request an available job concurrently
- **THEN** row locking permits only one worker to claim a given job
