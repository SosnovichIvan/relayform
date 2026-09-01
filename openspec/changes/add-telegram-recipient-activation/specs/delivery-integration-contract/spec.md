## ADDED Requirements

### Requirement: Telegram recipient activation

The backend MUST bind a Telegram destination through a short-lived one-time bot-start link instead of requiring the user to enter a chat identifier.

#### Scenario: Activation link created

- **WHEN** an authenticated owner requests activation for a pending Telegram destination
- **THEN** the service returns a bot-start link containing a random code that expires after 15 minutes

#### Scenario: Bot start received

- **WHEN** a protected Telegram webhook delivers `/start <validCode>` with a chat ID
- **THEN** the destination stores that chat ID internally, becomes active and the code cannot be reused

#### Scenario: Invalid activation code

- **WHEN** a code is expired, unknown or already consumed
- **THEN** no destination changes and the webhook returns a generic success response
