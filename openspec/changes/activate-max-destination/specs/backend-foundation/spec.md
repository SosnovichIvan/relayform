## ADDED Requirements

### Requirement: MAX destination activation through bot contact

The backend MUST activate a MAX destination only after the configured MAX bot webhook supplies a user for a current one-time activation token.

#### Scenario: Owner starts activation
- **WHEN** the authenticated owner requests activation for a pending MAX destination
- **THEN** Relayform replaces the previous token, stores only its digest and returns a 15-minute deep link for the configured bot.

#### Scenario: MAX user opens the deep link
- **WHEN** MAX sends a secret-authenticated `bot_started` event containing the current token before expiry
- **THEN** Relayform consumes the token once and atomically activates the destination with the event user ID.

#### Scenario: Webhook is untrusted
- **WHEN** the webhook secret, event shape or activation token is invalid
- **THEN** no destination changes and no secret or recipient is exposed.

### Requirement: MAX bot notification transport

The delivery worker MUST send text to confirmed MAX recipients through the MAX Platform API using only Relayform runtime credentials.

#### Scenario: MAX accepts a message
- **WHEN** the worker dispatches a valid MAX delivery
- **THEN** the adapter returns a provider receipt marker based on the documented response timestamp.

#### Scenario: MAX rejects or cannot process a message
- **WHEN** MAX reports a rate-limit or temporary failure
- **THEN** the adapter returns a redacted retryable failure
- **AND WHEN** input or recipient is invalid
- **THEN** the adapter returns a redacted terminal failure.
