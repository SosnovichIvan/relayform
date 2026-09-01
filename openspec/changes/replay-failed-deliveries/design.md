# Design

## Safe listing

`GET /v1/projects/:projectId/failed-deliveries` requires the cabinet session and verifies project ownership. It returns at most 20 latest attempts whose current status is `failed`: `id`, `formId`, provider, stable failure code, retryable classification and failure timestamp. It never returns recipient, message, event ID, destination ID, idempotency key, provider body or service credential. Unknown and foreign projects share `404`.

## Atomic replay and audit

`POST /v1/projects/:projectId/delivery-attempts/:attemptId/replay` requires the cabinet session and verifies project ownership before the repository locks the attempt inside the same project boundary. Only `failed` attempts can transition to `queued`; queued/delivered attempts return a stable conflict and unknown/foreign attempts return `404`.

The same transaction clears the safe prior outcome, resets `attempt_count` to zero, clears completion/lease fields, makes the durable job immediately available and inserts `delivery_replay_audit` with attempt, project, requesting user, previous failure code and previous attempt count. Recipient and message are not copied into audit. A concurrent second replay observes the queued state and cannot create another audit event.

When the API-local worker is enabled it receives a wake hint. Production correctness relies on the separate worker poller and PostgreSQL state.

## Frontend

The cabinet loads forms, 30-day statistics and recent failures for the selected project. A compact “Неудачные доставки” section appears only when failures exist. Rows identify the form, provider, stable human-readable reason and failure time. Each row has one small “Повторить” action with per-row progress. Success reloads project data so counters and list reflect the durable state; failure retains the row and shows a safe retryable error. Unauthorized responses return to login. Semantic theme tokens and wrapping mobile layout are mandatory.
