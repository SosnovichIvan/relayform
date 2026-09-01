# Design

## API boundary

`GET /v1/projects/:projectId/delivery-stats` requires the existing owner session and returns a fixed 30-day aggregate. Unknown and foreign projects share `404`. The response contains counts and provider names only; it never exposes message content, recipient, destination ID, idempotency key or raw failure data.

## Aggregation

Each accepted delivery records enough internal form/provider context for the in-memory repository. PostgreSQL derives the same grouping through delivery attempts, destinations and jobs. Both repositories implement one statistics contract with overall counts plus form/provider groups. The period uses `[now - 30 days, now]`; delivery rate is derived by the frontend rather than stored.

## Frontend

The Cabinet fetches forms and project statistics together after project selection. Four compact semantic widgets show total, delivered, failed and queued counts. Every form card shows its own totals and provider breakdown while retaining compact edit/delete controls. No-attempt forms display zero values rather than a misleading loading state. API failure retains the forms already held in state only when a future partial-refresh change explicitly supports it; this MVP treats the paired load as one retryable state.
