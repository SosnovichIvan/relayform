## ADDED Requirements

### Requirement: VK activation experience

The frontend MUST connect VK through the Relayform community without asking the owner for provider credentials or a raw recipient identifier.

#### Scenario: Owner saves a VK destination
- **WHEN** the pending VK destination is persisted
- **THEN** the editor shows the configured community link, the exact one-time command and a status-check action.

#### Scenario: Owner checks activation
- **WHEN** the backend reports the destination active
- **THEN** the frontend returns to the cabinet
- **AND WHEN** it remains pending
- **THEN** the activation instruction stays visible without overwriting the server-managed recipient.
