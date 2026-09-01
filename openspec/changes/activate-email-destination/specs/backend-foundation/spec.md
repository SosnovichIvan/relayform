## ADDED Requirements

### Requirement: E-mail destination ownership activation

The backend MUST activate an e-mail destination only after a current digest-only token sent to its configured address is consumed once.

#### Scenario: Owner requests activation
- **WHEN** the authenticated owner requests activation for a pending e-mail destination
- **THEN** Relayform replaces any prior pending token, sends one fixed ownership message and returns only sent status and expiry.

#### Scenario: Recipient confirms in time
- **WHEN** the first valid token is consumed before 15 minutes
- **THEN** the activation and destination become confirmed/active atomically.

#### Scenario: Confirmed recipient changes
- **WHEN** the owner changes the address of an active e-mail destination
- **THEN** the destination returns to pending activation and cannot receive events until the new address is confirmed.

#### Scenario: Token cannot be consumed
- **WHEN** a token is unknown, expired or already used
- **THEN** the backend returns a distinct stable error with no recipient or provider diagnostic.

### Requirement: Only active destinations receive events

The event API MUST resolve a destination only when it belongs to the API-key project and is active.

#### Scenario: Destination is pending
- **WHEN** a project submits an event for its pending destination
- **THEN** the backend returns the same `404` used for unknown or foreign destinations and creates no attempt.

### Requirement: Resend e-mail notification transport

The delivery worker MUST send fixed escaped notifications to active e-mail destinations using only Relayform runtime credentials.

#### Scenario: E-mail provider accepts a notification
- **WHEN** the worker dispatches a valid e-mail job
- **THEN** the adapter sends escaped HTML/plain text with fixed Relayform subject/attribution and returns a provider message ID.

#### Scenario: E-mail provider fails
- **WHEN** the provider returns `429`/`5xx` or a network error
- **THEN** the adapter reports a redacted retryable failure
- **AND WHEN** input or provider `4xx` is permanent
- **THEN** it reports a redacted terminal failure.
