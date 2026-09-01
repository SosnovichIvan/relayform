## ADDED Requirements

### Requirement: Persisted template list

The cabinet MUST list confirmation templates for the selected owned project and support create, edit and confirmed delete actions.

#### Scenario: Project has no templates

- **WHEN** the selected project returns no templates
- **THEN** the page shows a specific empty state and create action

#### Scenario: Template deletion fails

- **WHEN** a confirmed delete request fails
- **THEN** the template remains listed and a retryable error is shown

### Requirement: Fixed-brand live preview

The editor MUST preview subject, text and selected theme while keeping the Relayform structure, CTA and attribution fixed.

#### Scenario: Theme changes

- **WHEN** the user chooses light or dark
- **THEN** the preview updates through semantic theme roles without changing editable content

#### Scenario: Mobile editor opens

- **WHEN** the editor is viewed on a mobile viewport
- **THEN** the preview precedes the independently scrollable fields and save action

#### Scenario: Template is saved

- **WHEN** all fields and redirect URL are valid
- **THEN** the persisted template is shown in the refreshed list
