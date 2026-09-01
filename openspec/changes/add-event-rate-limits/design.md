## Rate-limit boundary

Rate limiting runs after API-key verification and before destination lookup or attempt creation. The key is the internal project ID, never the presented API key. A fixed window keeps MVP behaviour deterministic and testable.

The default allowance is 60 accepted intake requests per 60 seconds. `EVENT_RATE_LIMIT_MAX` and `EVENT_RATE_LIMIT_WINDOW_MS` may override it with positive integers. Exceeded requests return `429`, `{ "error": "rateLimitExceeded" }` and a whole-second `Retry-After` header. They do not create delivery attempts.

## Runtime scope

The initial limiter is process-local. This is safe for the current single-backend Compose topology. A distributed limiter is required before horizontally scaling backend replicas.

## Validation

Unit tests cover window rollover, independent projects and retry timing. API integration tests cover the `429` contract. Existing 90% coverage gates remain mandatory.
