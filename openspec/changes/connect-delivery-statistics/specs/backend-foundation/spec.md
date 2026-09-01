## ADDED Requirements

### Requirement: Owner-scoped delivery statistics

The backend MUST return a fixed 30-day delivery-attempt aggregate only for a project owned by the authenticated session user.

#### Scenario: Owner loads project statistics
- **WHEN** the owner requests statistics for an owned project
- **THEN** the response contains total, delivered, failed and queued counts overall and grouped by form/provider
- **AND THEN** attempts older than 30 days are excluded.

#### Scenario: Project is unknown or foreign
- **WHEN** an authenticated user requests an inaccessible project
- **THEN** the backend returns `404` without revealing whether that project exists.

#### Scenario: Statistics are returned safely
- **WHEN** statistics contain successful and failed attempts
- **THEN** the response contains no message, recipient, destination ID, idempotency key, provider message ID or failure diagnostic.
