# Design

## Request and identity boundary

`POST /v1/email-verifications` requires the existing project API key and `X-Idempotency-Key`. Its body contains an owned `templateId` and normalized recipient e-mail. After provider acceptance, the response is `202` with a verification ID and `sent` status only; it never returns the token, recipient, template body or provider diagnostics. A duplicate project/idempotency pair returns the existing safe response without sending twice.

## Token lifecycle

Relayform generates 32 random bytes encoded as base64url, stores only a SHA-256 digest and sets a 15-minute expiry. Confirmation uses `POST /v1/email-verifications/confirm`. Consumption is atomic: the first valid request marks the row confirmed and returns the already validated template redirect URL. Expired, unknown and already-used tokens have stable error codes. PostgreSQL is authoritative in production; an equivalent in-memory implementation supports isolated tests.

## Delivery

The application renders fixed Relayform HTML and plain text from the persisted subject/body/theme. Tenant content is escaped, the CTA and attribution are fixed, and the confirmation URL is built from the server-owned `PUBLIC_APP_URL`. A Resend adapter reads `EMAIL_PROVIDER_API_KEY` and `EMAIL_FROM_ADDRESS` only at runtime. Provider bodies and credentials never enter API errors or persistence. Synchronous provider failure marks the request failed and returns a retryable `503`; background retry is deferred.

## Public result route

The e-mail CTA opens `/verify-email?token=...`. The server-only Next.js route posts the token to Fastify. On success it performs a 303-style framework redirect to the validated tenant URL. Invalid, expired, already-used and temporarily unavailable results render a small branded, theme-aware status page without exposing backend diagnostics or the token in rendered markup.

## Abuse controls

Requests reuse a project-scoped fixed-window limiter independent from lead intake. Validation runs after API-key authentication and before token issuance. E-mail addresses and tokens are never logged. The MVP stores the normalized recipient only for lifecycle/audit and leaves retention automation for a later change.
