## Why

The public event endpoint is authenticated and idempotent but currently accepts an unlimited number of requests. A leaked project key or faulty form integration could exhaust delivery capacity.

## What Changes

- Add a per-project fixed-window rate limit to public event intake.
- Return a standard `429` response with `Retry-After` when the project exceeds its allowance.
- Keep limits configurable without exposing project keys or recipient data.

## Non-goals

- Distributed Redis coordination, customer-specific plans and automatic blocking are not included in this MVP increment.
