## ADDED Requirements

### Requirement: Automatic durable worker polling

When PostgreSQL is configured, the API process MUST automatically poll and drain claimable delivery jobs without requiring a new event to wake the worker.

#### Scenario: Process restarts with queued work

- **WHEN** the API becomes ready while PostgreSQL contains an available incomplete delivery job
- **THEN** the in-process worker claims and processes that job

#### Scenario: Poll takes longer than its interval

- **WHEN** a polling pass is still running at the next interval
- **THEN** the runner does not start an overlapping pass

#### Scenario: API shuts down

- **WHEN** Fastify begins closing
- **THEN** the runner cancels future polling
