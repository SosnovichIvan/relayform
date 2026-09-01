## ADDED Requirements

### Requirement: Owned form lifecycle

The backend MUST persist a form name and absolute HTTP(S) site URL and MUST scope create, read, update and delete operations to the authenticated owner.

#### Scenario: Owner creates a form

- **WHEN** an authenticated owner submits a name and valid site URL for an owned project
- **THEN** the backend persists and returns the form

#### Scenario: Owner edits a form

- **WHEN** the owner changes the name or site URL
- **THEN** the backend persists both current values

#### Scenario: Foreign form is requested

- **WHEN** a session requests a form outside its projects
- **THEN** the API returns the same not-found response as for an unknown form

#### Scenario: Invalid site URL is submitted

- **WHEN** a create or update payload contains a non-HTTP(S) or malformed URL
- **THEN** the API rejects it without persistence

### Requirement: Recipient-only destination editing

The authenticated owner MUST be able to list, create, update and delete supported destinations without sending or receiving provider credentials.

#### Scenario: Several providers are selected

- **WHEN** the owner configures multiple supported providers for one form
- **THEN** each provider is persisted as an independent destination

#### Scenario: Telegram is selected

- **WHEN** the owner selects Telegram
- **THEN** recipient activation is completed through the Relayform bot flow rather than manual `chat_id` input
