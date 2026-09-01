## Why

The MVP event endpoint currently accepts arbitrary destination identifiers. A public form must be scoped to its owning project before Relayform creates a delivery attempt.

## What Changes

- Require a project API key and an idempotency key for event intake.
- Verify that the requested destination belongs to the project represented by that key.
- Preserve duplicate-safe delivery attempts without exposing recipient details.

## Non-goals

- Provider transport adapters, event signatures and persistent PostgreSQL repositories are not included.
