## Intake to worker boundary

`POST /v1/events` accepts a normalized text `message`, validates its presence and loads only the destination required for internal delivery after project ownership is established. The client response never exposes recipient data. The in-process queue job contains provider, recipient and message because the current single-process MVP worker needs them; logs must not print job bodies.

## Worker outcomes

The worker resolves a provider transport from an injected registry. On success it records `delivered` with a provider message ID. A safe `DeliveryTransportError` records `failed`, its stable error code and retryable flag. Unknown providers and unexpected exceptions become non-secret stable failures.

This change does not automatically retry failures. Retry scheduling and a durable queue require a later change.

## Validation

Tests cover successful transport selection, safe failures, missing adapters and intake payload validation. Existing 90% coverage gates remain mandatory.
