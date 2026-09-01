## Ownership

Every new attempt stores the internal project ID that authorized intake. `GET /v1/delivery-attempts/:attemptId` resolves the presented project API key and returns the attempt only when project IDs match. Missing and cross-project attempts share the same `404` response.

## Response

The response contains `id`, `status` and optional `providerMessageId`, `failureCode`, `isRetryable`. It never contains destination ID, recipient, message, idempotency key, token or raw provider response.

The current attempt store is process-local. Durable history and aggregates require a later PostgreSQL/queue change.

## Validation

Tests cover queued/delivered/failed shapes, unauthorized access and cross-project isolation. Existing 90% coverage gates remain mandatory.
