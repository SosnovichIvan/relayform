## ADDED Requirements

### Requirement: VK destination activation through community contact

The backend MUST activate a VK destination only after the VK community callback supplies a sender for a current one-time activation code.

#### Scenario: Owner starts activation
- **WHEN** the authenticated owner requests activation for a pending VK destination
- **THEN** Relayform replaces the previous code, stores only its digest and returns a 15-minute code with the configured community URL.

#### Scenario: VK sender supplies the code
- **WHEN** the configured community sends a secret-authenticated `message_new` callback containing `/start <code>` before expiry
- **THEN** Relayform consumes the code once and atomically activates the destination with the callback sender ID.

#### Scenario: Callback is untrusted
- **WHEN** the community ID, callback secret, event shape or activation code is invalid
- **THEN** no destination changes and no secret or recipient is exposed.

### Requirement: VK community notification transport

The delivery worker MUST send text to confirmed VK recipients through `messages.send` using only Relayform runtime credentials.

#### Scenario: VK accepts a message
- **WHEN** the worker dispatches a valid VK delivery
- **THEN** the adapter supplies a unique `random_id` and returns the numeric provider message ID.

#### Scenario: VK rejects or cannot process a message
- **WHEN** VK reports a rate-limit/temporary failure
- **THEN** the adapter returns a redacted retryable failure
- **AND WHEN** input, consent or recipient is invalid
- **THEN** the adapter returns a redacted terminal failure.
