## MODIFIED Requirements

### Requirement: Secure event intake

The backend MUST accept a form event only when a valid project API key is presented, an idempotency key is supplied, the requested destination belongs to that project and a non-empty normalized message is supplied. It MUST create no recipient or credential data in a client response.

#### Scenario: Queued text event

- **WHEN** an authenticated project submits a valid destination and normalized message
- **THEN** the service creates one internal delivery job and returns only the delivery attempt identifier and state

#### Scenario: Missing message

- **WHEN** an authenticated project submits an event without a usable message
- **THEN** the service rejects it before creating a delivery attempt
