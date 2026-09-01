## ADDED Requirements

### Requirement: Owner-scoped failed delivery operations

The backend MUST expose recent final failures and replay only to the authenticated owner of their project.

#### Scenario: Owner lists recent failures
- **WHEN** the project owner requests failed deliveries
- **THEN** Relayform returns at most 20 newest failed attempts with form, provider, stable failure metadata and timestamp
- **AND** omits messages, recipients, event identifiers, destination identifiers and provider diagnostics.

#### Scenario: Unknown or foreign resource is requested
- **WHEN** a session requests another owner's project or attempt
- **THEN** Relayform returns the same not-found response used for an unknown resource.

### Requirement: Audited atomic delivery replay

The backend MUST atomically return only a final failed job to the durable queue and record the requesting owner.

#### Scenario: Owner replays a failed attempt
- **WHEN** the owner requests replay for a failed attempt
- **THEN** its outcome and leases are cleared, attempt budget resets, the job becomes immediately claimable and one redacted audit record is stored.

#### Scenario: Attempt is not failed
- **WHEN** replay targets a queued or delivered attempt
- **THEN** the backend returns a conflict and changes neither the job nor the audit log.

#### Scenario: Concurrent replay is requested
- **WHEN** two requests target the same failed attempt
- **THEN** row locking permits only one failed-to-queued transition and one audit event.
