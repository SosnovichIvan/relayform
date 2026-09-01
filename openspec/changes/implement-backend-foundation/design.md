## Architecture decision

Backend will be a separate Node.js TypeScript service rather than Next.js route handlers, because delivery processing, queue lifecycle, provider credential isolation and independent worker scaling do not belong to the frontend runtime.

PostgreSQL stores ownership-scoped domain records; a Redis-compatible queue boundary runs delivery jobs. Credentials stay in `APP_TOKENS_FILE`, passed only to backend/worker. A mock transport permits deterministic integration tests before provider adapters are approved.

## Security

- Passwords use a modern password hash; project API keys are shown once and stored as hashes.
- Every query verifies the authenticated owner/project boundary.
- Delivery diagnostics and logs are redacted; credentials and complete sensitive submission fields never reach the client.
- Incoming events require an API key/signature, timestamp, idempotency key and rate limit.

## Validation

- Backend coverage gate uses the same 90% statement, branch, function and line requirement.
- Integration tests run against isolated PostgreSQL/queue containers; provider transport is mocked.
