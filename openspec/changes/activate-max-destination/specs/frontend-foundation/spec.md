## ADDED Requirements

### Requirement: MAX activation experience

The frontend MUST connect MAX through the Relayform bot without asking the owner for provider credentials or a raw recipient identifier.

#### Scenario: Owner saves a MAX destination
- **WHEN** the pending MAX destination is persisted
- **THEN** the editor shows the configured bot deep link and a status-check action.

#### Scenario: Owner checks activation
- **WHEN** the backend reports the destination active
- **THEN** the frontend returns to the cabinet
- **AND WHEN** it remains pending
- **THEN** the activation instruction stays visible without overwriting the server-managed recipient.
