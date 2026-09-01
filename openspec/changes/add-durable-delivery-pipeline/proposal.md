## Why

Delivery attempts and jobs currently exist only in API process memory. A restart after returning `202 queued` can lose the notification and its status.

## What Changes

- Add PostgreSQL schemas for submissions, durable attempts and claimable delivery jobs.
- Create attempts and jobs atomically with project-scoped idempotency.
- Claim jobs with row locking, leases and recovery of abandoned work.
- Persist sanitized delivered/failed outcomes and status lookup.

## Non-goals

- Horizontal worker autoscaling, Redis, dead-letter UI, manual retry and structured multi-field submissions are not included.
