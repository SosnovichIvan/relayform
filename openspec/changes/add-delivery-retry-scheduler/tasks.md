## 1. Persistence

- [x] 1.1 Add durable attempt-count and maximum-attempt migration fields.
- [x] 1.2 Extend in-memory and PostgreSQL repositories with scheduled retry semantics.

## 2. Worker policy

- [x] 2.1 Add bounded exponential backoff with injectable jitter and provider delay hints.
- [x] 2.2 Retry only classified temporary failures and finalize permanent or exhausted failures.

## 3. Runtime

- [x] 3.1 Add a non-overlapping worker poller with immediate startup drain and clean shutdown.
- [x] 3.2 Wire polling into Fastify while preserving direct enqueue wake-up.

## 4. Verification

- [x] 4.1 Update project context and run tests, coverage, lint, typecheck, build and Compose validation.
