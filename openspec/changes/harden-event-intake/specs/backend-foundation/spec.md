## MODIFIED Requirements

### Requirement: Secure event intake

The backend MUST accept a form event only when a valid project API key is presented, an idempotency key is supplied and the requested destination belongs to that project. It MUST create no recipient or credential data in a client response.

#### Scenario: Scoped event submission

- **WHEN** a client submits an event with a valid project API key, an idempotency key and a destination owned by that project
- **THEN** the service creates a queued delivery attempt

#### Scenario: Cross-project destination

- **WHEN** a client submits an event using a valid API key but a destination from another project
- **THEN** the service rejects the request without queuing a delivery attempt

#### Scenario: Repeated event submission

- **WHEN** the client repeats the same event with the same scoped idempotency key
- **THEN** the service returns the original delivery attempt as a duplicate
