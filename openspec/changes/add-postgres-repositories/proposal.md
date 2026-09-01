## Why

The MVP API currently uses an in-memory store, so accounts and configuration disappear after a service restart. PostgreSQL is already provisioned in production Compose and needs a repository boundary.

## What Changes

- Add a PostgreSQL client and repository implementation for durable domain records.
- Run schema migrations explicitly as part of deployment.
- Keep the in-memory repository available to isolated unit tests.

## Non-goals

- Migrating existing local in-memory data, provider transport adapters and a distributed queue are out of scope.
