## Why

The Telegram adapter is isolated and the current worker always simulates success. Delivery jobs need enough provider-neutral data for a worker to invoke a configured real transport and persist a safe outcome.

## What Changes

- Extend internal delivery jobs with provider, recipient and normalized message data.
- Add destination lookup scoped to the authenticated project during event intake.
- Add a transport worker that selects an adapter and records delivered or failed attempts.

## Non-goals

- Distributed queueing, automatic retries, Telegram activation and adapters for VK, MAX or e-mail are not included.
