## ADDED Requirements

### Requirement: Project-scoped delivery status

The backend MUST expose a delivery attempt status only to the project API key that created it and MUST return no submission or recipient content.

#### Scenario: Owned attempt

- **WHEN** a project requests its delivery attempt with its valid API key
- **THEN** the service returns the sanitized state and safe provider outcome metadata

#### Scenario: Cross-project attempt

- **WHEN** a valid project key requests an attempt created by another project
- **THEN** the service returns the same `404` used for an unknown attempt

#### Scenario: Missing API key

- **WHEN** attempt status is requested without a valid project API key
- **THEN** the service returns `401`
