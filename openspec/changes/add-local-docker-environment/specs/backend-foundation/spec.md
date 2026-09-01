## ADDED Requirements

### Requirement: Reproducible local container environment

The repository MUST provide a safe local Docker environment containing the frontend, backend API, delivery worker and PostgreSQL required for manual product testing.

#### Scenario: Developer starts the local environment
- **WHEN** the documented local start command is executed on a Docker host
- **THEN** PostgreSQL becomes healthy and the backend applies committed migrations before serving requests
- **AND** the backend becomes ready before the frontend and worker start
- **AND** frontend and backend health endpoints become reachable through loopback addresses.

#### Scenario: Developer tests without provider credentials
- **WHEN** the environment uses the committed local example files
- **THEN** the application starts without Telegram, VK, MAX or e-mail secrets
- **AND** no real provider credential is required for authentication, project, form or template manual testing.

#### Scenario: Developer opts into real delivery testing
- **WHEN** `APP_TOKENS_FILE` references the ignored local provider-token file
- **THEN** only backend and worker containers receive those credentials
- **AND** frontend configuration and committed files remain credential-free.

### Requirement: Safe local lifecycle

The local container environment MUST expose developer services only on loopback and MUST preserve database state unless reset is explicitly requested.

#### Scenario: Developer stops the environment
- **WHEN** the normal local stop command is executed
- **THEN** containers and network stop while the named PostgreSQL volume remains available.

#### Scenario: Developer resets local data
- **WHEN** the explicit reset command is executed
- **THEN** containers and the local PostgreSQL volume are removed
- **AND** documentation warns that the reset deletes local test data.
