# Change: Add a local Docker environment

## Why

Relayform has a production Compose model, but contributors do not have a documented, one-command local environment for manual end-to-end testing. Reusing the production model directly requires ad hoc environment variables, does not expose the backend diagnostics port and makes the boundary between safe local defaults and real provider credentials unclear.

## What changes

- Add a dedicated local Docker Compose model for the frontend, backend, delivery worker and PostgreSQL.
- Start database migrations as part of backend startup and gate dependent services on health/readiness.
- Bind all developer-facing ports to loopback and persist PostgreSQL data in a named local volume.
- Provide safe committed local environment defaults with no provider credentials.
- Add npm convenience commands and a manual-testing guide, including optional real-provider testing through the ignored token file.

## Out of scope

- Provider emulators, seeded product data, production deployment, TLS, Nginx and committing real credentials are not included.
