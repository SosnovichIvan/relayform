## ADDED Requirements

### Requirement: Runnable frontend foundation

The repository MUST provide a runnable Next.js TypeScript frontend using Tailwind CSS v4 and the documented FSD layer boundaries.

#### Scenario: Local application startup

- **WHEN** a developer installs dependencies and starts the application
- **THEN** Landing, authentication and Cabinet routes are available
- **AND THEN** no provider secret is required for the UI to render.

### Requirement: Design-system themes and responsive product routes

The frontend MUST render responsive Light and Dark interfaces for Landing, Login, Registration and Cabinet using semantic design tokens.

#### Scenario: User changes theme

- **WHEN** a visitor toggles the selected theme
- **THEN** the current route switches Light/Dark without raw color values in JSX or Tailwind classes.

### Requirement: Supported destination selection

The Cabinet form editor MUST offer only Telegram, VK, MAX and e-mail as demo destination options.

#### Scenario: Owner selects a destination

- **WHEN** the owner selects a channel
- **THEN** it becomes a neutral configuration input with a visible clear control
- **AND THEN** no provider credential field is displayed.

### Requirement: Deployment-ready frontend health contract

The application MUST expose an unauthenticated HTTP 200 health endpoint and a Docker/Compose configuration that publishes only the frontend loopback port.

#### Scenario: Production container starts

- **WHEN** the production Compose service runs with a configured `APP_HTTP_PORT`
- **THEN** its health endpoint is reachable through the loopback port mapping
- **AND THEN** the service does not receive the provider token file.

### Requirement: Test coverage gate

The frontend test configuration MUST enforce at least 90% statement, branch, function and line coverage for the implemented source set.

#### Scenario: Quality verification

- **WHEN** a developer runs the coverage test command
- **THEN** the command fails if any configured coverage metric is below 90%.
