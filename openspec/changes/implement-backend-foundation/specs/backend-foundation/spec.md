## ADDED Requirements

### Requirement: Isolated backend runtime

Relayform MUST run its domain API and delivery worker outside the frontend runtime with PostgreSQL persistence and a queue boundary.

#### Scenario: Frontend deployment

- **WHEN** frontend and backend services run in production Compose
- **THEN** only backend and worker receive provider credentials
- **AND THEN** database and queue ports are not public.

### Requirement: Secure event intake

The backend MUST accept website form events only after project authentication, timestamp validation and idempotency validation.

#### Scenario: Repeated event submission

- **WHEN** the same `eventId` is submitted again for the same project
- **THEN** no additional delivery attempt is created.
