## ADDED Requirements

### Requirement: Protected frontend session

The frontend MUST authenticate through its same-origin BFF and MUST keep the backend session token inaccessible to browser JavaScript.

#### Scenario: Authentication succeeds

- **WHEN** Fastify accepts login or registration credentials
- **THEN** the BFF stores the session token in an `HttpOnly`, `SameSite=Lax` cookie and returns no token body

#### Scenario: Authentication fails

- **WHEN** Fastify rejects credentials or registration
- **THEN** the form shows a stable user-facing error and no session cookie is created

#### Scenario: User logs out

- **WHEN** the user activates logout
- **THEN** the BFF expires the session cookie and the UI returns to login

### Requirement: Persisted cabinet overview

The cabinet MUST render projects and forms from the authenticated backend instead of static demo records.

#### Scenario: New account has no projects

- **WHEN** the backend returns an empty project list
- **THEN** the cabinet shows a first-project creation state

#### Scenario: Project is selected

- **WHEN** a user selects an owned project
- **THEN** the cabinet loads and displays that project's persisted forms

#### Scenario: Project has no forms

- **WHEN** the selected project contains no forms
- **THEN** the cabinet shows a form-specific empty state and create-form action

#### Scenario: Session is rejected

- **WHEN** an authenticated BFF endpoint returns unauthorized
- **THEN** the cabinet navigates to login without exposing backend diagnostics

#### Scenario: Backend is unavailable

- **WHEN** a cabinet request cannot reach Fastify
- **THEN** the cabinet displays a retryable error state
