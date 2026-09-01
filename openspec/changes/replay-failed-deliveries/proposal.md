# Change: Replay failed deliveries from the cabinet

## Why

Relayform marks permanent failures and exhausted retries as final, but the project owner cannot see which recent attempts need attention or retry one after correcting a channel configuration. Reusing the public project API-key status endpoint would expose an operational action to website integrations and would not identify the accountable cabinet user.

## What changes

- Add a session-protected, owner-scoped list of recent final failures with only redacted operational metadata.
- Add an atomic replay operation that resets one failed job's attempt budget, returns it to the durable queue and records an audit event.
- Show recent failures in the cabinet with compact responsive retry controls and safe loading/error states.
- Keep public project API keys read-only with respect to replay.

## Out of scope

- Bulk replay, automatic replay, message/recipient inspection, editing payloads, retrying queued/delivered attempts, pagination beyond the fixed recent window and replaying e-mail-verification requests are not included.
