## Retry state

`delivery_jobs` stores `attempt_count` and `max_attempts`. Claiming a job atomically increments `attempt_count` and returns both counters to the worker. A retryable failure with attempts remaining keeps the public attempt in `queued`, records only the stable failure code/retryable flag, clears the lease and moves `available_at` into the future. A permanent failure or exhausted retry marks the attempt and job final.

## Delay policy

The worker uses bounded exponential backoff with jitter. The policy is injected for deterministic tests. When a transport exposes a valid `Retry-After` delay, the scheduled delay is at least that hint while remaining within the configured maximum. No raw provider response is persisted or returned.

## Polling lifecycle

A small in-process runner starts from the Fastify ready lifecycle, immediately checks for work and then polls at a fixed interval. It prevents overlapping drain passes, drains all currently claimable jobs up to a safety batch limit, and stops during Fastify close. PostgreSQL remains the durable source of truth, so restart does not depend on an in-memory timer.

Database-free tests use the same scheduling contract in memory. Direct enqueue wake-up remains as a latency optimization; correctness comes from the poller and persisted `available_at`.

## Migration safety

Existing jobs receive `attempt_count = 0` and `max_attempts = 5`. Checks prevent negative counts and a maximum lower than one. The claim index already covers `available_at` and incomplete jobs.

## Validation

Repository tests cover attempt counters, future availability, rescheduling and exhaustion. Worker tests cover permanent, retryable and provider-hinted failures. Runner tests use fake timers to prove immediate polling, overlap prevention and shutdown. Existing 90% coverage gates remain mandatory.
