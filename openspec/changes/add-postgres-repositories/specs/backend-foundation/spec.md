## ADDED Requirements

### Requirement: Durable configured runtime

When `DATABASE_URL` is configured, the backend MUST persist domain data in PostgreSQL and report readiness only after the configured database connection is usable.

#### Scenario: API restart

- **WHEN** the API restarts with the same configured PostgreSQL database
- **THEN** users, projects, forms, destinations and templates remain available

### Requirement: Explicit schema migration

The deployment MUST apply ordered backend migrations before the API starts accepting traffic.

#### Scenario: Fresh database

- **WHEN** the migration runner executes against an empty Relayform database
- **THEN** it creates all required schema tables and records every applied migration
