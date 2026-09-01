## ADDED Requirements

### Requirement: Credential-derived transport registry

The backend MUST construct a Telegram transport only from the Relayform-owned runtime bot token and MUST keep that token out of jobs, responses and failure records.

#### Scenario: Telegram token configured

- **WHEN** `TELEGRAM_BOT_TOKEN` contains a non-empty value
- **THEN** the runtime registry provides a Telegram transport

#### Scenario: Telegram token absent

- **WHEN** `TELEGRAM_BOT_TOKEN` is absent or blank
- **THEN** the registry contains no Telegram transport and no placeholder credential
