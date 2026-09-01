## Runtime registry

The API creates a Telegram transport only when `TELEGRAM_BOT_TOKEN` is a non-empty runtime value. The token remains inside the adapter and is never added to jobs, responses or diagnostics. Tests inject a registry directly.

## In-process execution

After a unique event is enqueued, the API schedules one worker pass without delaying the `202 queued` response. The worker already converts every provider failure into a safe attempt outcome, so the background promise must not leak a rejection. Duplicate events do not trigger a second delivery.

This topology matches the current single-backend MVP. Before multiple API replicas or zero-loss delivery are required, queue and worker execution must move to shared durable infrastructure.

## Validation

Tests cover environment registry construction, automatic dispatch and duplicate suppression. Existing 90% coverage gates remain mandatory.
