## ADDED Requirements

### Requirement: Owned confirmation-template lifecycle

The backend MUST persist subject, plain-text body, visual theme and post-confirmation redirect URL and MUST scope all template operations to the authenticated owner.

#### Scenario: Template is created

- **WHEN** an owner submits valid fields for an owned project
- **THEN** the backend persists and returns the template

#### Scenario: Template is opened

- **WHEN** an owner requests one existing template
- **THEN** the backend returns its current persisted fields

#### Scenario: Foreign template is requested

- **WHEN** a session requests a template outside its projects
- **THEN** the API returns the same not-found response as for an unknown template

#### Scenario: Unsafe redirect is submitted

- **WHEN** a redirect URL is malformed or uses a non-HTTP(S) scheme
- **THEN** the request is rejected without persistence
