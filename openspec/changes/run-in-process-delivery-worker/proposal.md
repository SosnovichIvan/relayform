## Why

Delivery jobs and real transports exist, but API intake does not start the worker. Telegram notifications therefore remain queued until code invokes the worker manually.

## What Changes

- Build the transport registry from Relayform-owned runtime credentials.
- Trigger one in-process worker pass after a new job is queued.
- Keep transport registry injection available for isolated tests.

## Non-goals

- A separate worker process, durable queue, concurrency controls and automatic retry scheduling are not included.
