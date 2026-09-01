## Why

Confirmation templates already have backend subject/body CRUD, but the frontend editor is demo-only and the backend cannot persist the selected visual theme or post-confirmation redirect URL.

## What Changes

- Extend template persistence with theme and validated redirect URL.
- Add owner-scoped single-template read API and same-origin BFF CRUD handlers.
- Add a persisted project-aware template list with create/edit/delete.
- Connect the editor and live preview while keeping fixed Relayform structure and attribution.

## Non-goals

- Sending confirmation e-mail, confirmation-token issuance/consumption, custom HTML, custom CTA labels and custom branding are not included.
