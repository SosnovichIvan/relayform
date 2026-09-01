## ADDED Requirements

### Requirement: Telegram text transport

The backend MUST send Telegram notifications through the Relayform-owned bot using the configured service token, a confirmed recipient chat identifier and a message within Telegram text limits.

#### Scenario: Successful Telegram delivery

- **WHEN** the Telegram Bot API accepts a valid recipient and message
- **THEN** the adapter returns the provider message identifier

#### Scenario: Temporary Telegram failure

- **WHEN** Telegram responds with rate limiting or a server failure
- **THEN** the adapter returns a retryable failure classification without exposing its token or recipient

#### Scenario: Invalid message length

- **WHEN** a message is empty or longer than 4096 characters
- **THEN** the adapter rejects it before making a provider request
