## ADDED Requirements

### Requirement: Confirmation request lifecycle

The backend MUST accept an idempotent confirmation request only for a template owned by the API-key project and MUST return no token or recipient data.

#### Scenario: Website requests a confirmation
- **WHEN** an authenticated project submits a valid recipient, owned template and new idempotency key
- **THEN** the backend persists a digest-only, expiring verification and sends one fixed Relayform-branded message
- **AND THEN** it returns `202` with only the verification ID and sent status.

#### Scenario: Website repeats a request
- **WHEN** the same project repeats an accepted idempotency key
- **THEN** the backend returns the existing safe result and does not send another message.

#### Scenario: Request crosses an ownership boundary
- **WHEN** a project requests another project's template
- **THEN** the backend returns the same `404` used for an unknown template and sends nothing.

### Requirement: Safe one-time confirmation

Confirmation tokens MUST be random, stored only as digests, expire after 15 minutes and be consumed at most once.

#### Scenario: Recipient confirms in time
- **WHEN** the first valid confirmation token is consumed before expiry
- **THEN** the backend atomically records confirmation and returns the template's validated redirect URL.

#### Scenario: Token is invalid, expired or already used
- **WHEN** confirmation cannot consume a current pending token
- **THEN** the backend returns a stable distinct error without exposing stored data or provider diagnostics.

### Requirement: Relayform-owned e-mail transport

The backend MUST send confirmation mail using server-owned credentials and fixed escaped markup.

#### Scenario: Provider accepts the message
- **WHEN** the configured provider accepts a rendered confirmation message
- **THEN** tenant subject/body appear as escaped content and the fixed CTA points to the server-owned Relayform confirmation URL.

#### Scenario: Provider is absent or fails
- **WHEN** the provider is unavailable or not configured
- **THEN** the request is marked failed and the API returns a stable retryable error without exposing credentials, recipient or raw provider output.
