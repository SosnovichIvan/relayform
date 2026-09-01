## ADDED Requirements

### Requirement: Public confirmation result

The frontend MUST consume a confirmation token only on the server and MUST render a branded semantic-theme result when it cannot redirect safely.

#### Scenario: Confirmation succeeds
- **WHEN** Fastify accepts the token and returns an HTTP(S) redirect URL
- **THEN** the frontend redirects without exposing the backend response or storing the token in client state.

#### Scenario: Confirmation does not succeed
- **WHEN** the token is invalid, expired, already used or the backend is unavailable
- **THEN** the frontend renders the matching accessible status with no raw token or diagnostic in the HTML.
