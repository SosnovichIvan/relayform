## ADDED Requirements

### Requirement: Persisted form editor

The cabinet form editor MUST create and edit backend forms and MUST represent saving, success, validation and failure states.

#### Scenario: New form is saved

- **WHEN** a user supplies a valid name and site URL
- **THEN** the form and selected destinations are persisted and the UI returns to the cabinet

#### Scenario: Existing form is opened

- **WHEN** the user opens an owned form from the cabinet
- **THEN** the editor loads its persisted fields and destinations

#### Scenario: Form is deleted

- **WHEN** the user confirms deletion
- **THEN** the form and its destinations are removed and the cabinet refreshes

### Requirement: Multi-provider destination editor

The editor MUST allow more than one supported provider to be configured and MUST clearly distinguish pending activation.

#### Scenario: Destination is cleared

- **WHEN** the user clears an existing provider input and saves
- **THEN** that destination is deleted while other configured providers remain

#### Scenario: Telegram is configured

- **WHEN** Telegram is selected and the form is saved
- **THEN** the UI offers the one-time Relayform bot link and never asks for `chat_id`
