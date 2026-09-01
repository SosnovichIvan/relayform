## ADDED Requirements

### Requirement: Independently runnable delivery worker

Production delivery MUST run in a private process that claims durable PostgreSQL jobs independently of the HTTP API process.

#### Scenario: Production API accepts an event
- **WHEN** the API persists a new delivery while its local worker is disabled
- **THEN** it returns the queued attempt without invoking a provider transport
- **AND** the separate worker can claim the same durable job.

#### Scenario: Worker receives a shutdown signal
- **WHEN** the standalone worker is asked to stop
- **THEN** it stops scheduling new polls and closes its PostgreSQL pool once.

#### Scenario: Worker restarts during delivery
- **WHEN** a worker exits after claiming but before completing a job
- **THEN** the existing lease expiry makes that unfinished job claimable again.

### Requirement: Worker credential isolation

The worker MUST receive Relayform provider credentials without exposing them to the frontend or a public network port.

#### Scenario: Production services start
- **WHEN** Compose creates frontend, API and worker containers
- **THEN** only API and worker receive the token file
- **AND** only the frontend publishes an HTTP port.
