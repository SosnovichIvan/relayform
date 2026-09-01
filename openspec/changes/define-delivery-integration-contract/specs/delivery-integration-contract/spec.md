## Purpose

Defines the backend planning contract for delivery of Relayform submissions to configured notification channels.

## ADDED Requirements

### Requirement: Provider-neutral delivery event
The backend MUST normalize each accepted form submission into a delivery event with a stable event ID, form/project context, submitted fields, submission metadata and requested destinations.

#### Scenario: Fan-out to configured destinations
- **WHEN** a valid form submission is accepted
- **THEN** the backend creates one delivery attempt per active destination without exposing one destination's secrets to another

### Requirement: Destination configuration safety
The backend MUST validate provider configuration server-side. Relayform-owned provider credentials MUST be encrypted at rest and MUST NOT be configurable or returned to tenant clients. A client MAY configure only a provider-specific recipient identifier and non-secret delivery preferences.

#### Scenario: Editing an integration
- **WHEN** a user saves a destination configuration
- **THEN** the backend validates the provider-specific recipient identifier and does not return or accept tokens, passwords or private keys in the response

### Requirement: Recipient onboarding
The backend MUST expose the activation state of a destination when a provider requires the recipient to initiate contact, grant permission or opt in before delivery.

#### Scenario: Recipient has not activated a bot channel
- **WHEN** a user saves a recipient identifier for a channel that requires prior contact with the Relayform bot
- **THEN** the destination remains pending and the client receives a non-secret activation instruction rather than a false active status

### Requirement: Delivery lifecycle
The backend MUST record an idempotent delivery lifecycle with retryable and terminal failure states, provider response metadata and redacted diagnostics.

#### Scenario: Temporary provider failure
- **WHEN** a provider request fails transiently
- **THEN** the delivery is retried according to a bounded policy and remains traceable by event and attempt IDs
