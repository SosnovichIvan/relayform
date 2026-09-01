# Failed delivery replay

## Purpose

Give a project owner a safe operational path to retry final delivery failures after correcting provider configuration.

## Backend contract

- Session authentication and project ownership are mandatory for list and replay; both routes carry the project ID so repository queries stay project-scoped.
- The list is fixed to the 20 newest `failed` attempts.
- Safe output: attempt ID, form ID, provider, stable failure code, retryable flag and failure timestamp.
- Forbidden output: message, recipient, event/destination/idempotency identifiers, raw provider data and credentials.
- Only `failed` transitions to `queued`; other known states return conflict.
- Replay atomically resets attempt count, completion, availability, lease and safe outcome fields.
- The same transaction records requesting user, project, attempt, previous safe failure code and attempt count.

## Frontend states

- `hidden`: selected project has no recent final failures.
- `ready`: compact rows and replay actions are visible.
- `replaying`: only the selected row action is disabled and announces progress.
- `error`: rows remain visible with a safe retry message.
- `unauthorized`: navigate to `/login`.
