## PostgreSQL queue

The single-VPS MVP uses PostgreSQL as the durable queue instead of introducing Redis. Event acceptance writes a submission, delivery attempt and delivery job in one database transaction. The project-scoped idempotency key uniquely identifies an attempt; a duplicate returns the existing ID and creates no second job.

Jobs contain provider, recipient and normalized message because a restarted worker must reconstruct delivery. These fields stay server-side and are never selected by status APIs or logs. A later privacy change may encrypt sensitive payload columns.

## Claim and lease

Workers claim one available job with `FOR UPDATE SKIP LOCKED`, set a random worker ID and lease expiry, then commit before transport I/O. Jobs whose lease expired become claimable again. A successful outcome marks the attempt delivered and removes/completes the job. A classified failure persists only stable metadata; retry scheduling remains a later change, so retryable failures are recorded without automatic rescheduling in this increment.

## Runtime selection

When `DATABASE_URL` is configured, intake, worker and status lookup use the PostgreSQL delivery repository. Tests and database-free development keep the in-memory implementation behind the same asynchronous interface.

## Migration safety

The repository has no production data yet. The migration upgrades the existing prototype `delivery_attempts` table in place, derives project ownership through destination/form relations, and fails rather than silently accepting orphaned rows.

## Validation

Repository tests cover transaction ordering, idempotency, claim SQL, safe outcomes and status isolation. Existing 90% coverage gates remain mandatory; Compose config and migrations are checked before handoff.
