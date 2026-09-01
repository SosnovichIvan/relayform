## ADDED Requirements

### Requirement: Protected Telegram webhook

The backend MUST accept Telegram activation updates only when the configured webhook secret header matches and MUST return no activation secrets or recipient identifiers.

#### Scenario: Valid webhook secret

- **WHEN** Telegram posts a valid `/start` update with the configured secret header
- **THEN** the backend may consume the matching activation code

#### Scenario: Invalid webhook secret

- **WHEN** the webhook secret header is absent or incorrect
- **THEN** the backend rejects the update without consuming any activation code
