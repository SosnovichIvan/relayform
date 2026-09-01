## Why

Retryable provider failures are currently persisted as final failures. A temporary network error, `429` or provider `5xx` therefore loses an otherwise deliverable notification, and durable jobs are not polled automatically after an API restart.

## What Changes

- Track bounded delivery attempt counts on durable jobs.
- Reschedule retryable failures with exponential backoff, jitter and a provider `Retry-After` hint.
- Run a non-overlapping in-process poller that drains available jobs and resumes them after restart.
- Keep permanent failures and exhausted retries final, sanitized and queryable.

## Non-goals

- A separate worker service, manual replay UI, Redis, dead-letter administration and provider-specific circuit breakers are not included.
