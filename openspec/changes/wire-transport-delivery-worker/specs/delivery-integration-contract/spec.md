## ADDED Requirements

### Requirement: Provider transport dispatch

The worker MUST select a configured transport using the internal destination provider and MUST persist a safe delivery outcome.

#### Scenario: Transport delivery succeeds

- **WHEN** the selected transport returns a provider message identifier
- **THEN** the delivery attempt becomes `delivered` with that identifier

#### Scenario: Transport delivery fails

- **WHEN** the selected transport raises a classified failure
- **THEN** the attempt becomes `failed` with only a stable error code and retryable flag

#### Scenario: Transport is unavailable

- **WHEN** no adapter is configured for the destination provider
- **THEN** the attempt becomes a non-retryable `transportNotConfigured` failure
