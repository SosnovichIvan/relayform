# Change: Connect delivery statistics

## Why

The Cabinet currently shows only a form count even though delivery attempts are persisted. Owners cannot see whether form messages are being delivered or failing.

## What changes

- Add a session-authenticated, owner-scoped 30-day project statistics endpoint.
- Aggregate queued, delivered and failed attempts overall, by form and by provider.
- Add a same-origin BFF route and typed delivery-statistics entity.
- Replace the Cabinet placeholder with responsive semantic-theme widgets and per-form details.
- Preserve loading, empty, failure, retry and unauthorized behavior.

## Out of scope

- Custom date ranges, charts, real-time streaming, recipient/message drill-down, exports and manual retry are not included.
