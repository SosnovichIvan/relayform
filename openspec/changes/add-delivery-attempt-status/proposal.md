## Why

Event intake returns a delivery attempt identifier, but integrations cannot determine whether the asynchronous worker delivered or failed the notification.

## What Changes

- Scope delivery attempts to their authenticated project.
- Add an API-key-protected endpoint for a sanitized attempt status.
- Return only state, provider message ID and stable failure metadata.

## Non-goals

- Attempt history, dashboard aggregates, PostgreSQL persistence and retry controls are not included.
