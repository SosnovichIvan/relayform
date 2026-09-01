## ADDED Requirements

### Requirement: Sanitized attempt outcome

The delivery status contract MUST expose only stable state and provider outcome metadata.

#### Scenario: Delivery failed

- **WHEN** a worker records a classified failure
- **THEN** status includes `failed`, a stable `failureCode` and `isRetryable`, without raw diagnostics

#### Scenario: Delivery succeeded

- **WHEN** a worker records successful delivery
- **THEN** status includes `delivered` and the provider message identifier
