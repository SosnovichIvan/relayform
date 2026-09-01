# MAX destination activation

## Purpose

Relayform connects a MAX destination through its own bot. The project owner never enters a bot token, password or raw MAX user ID.

## Contract

- A pending MAX destination stores `pending` until activation succeeds.
- The owner requests a one-time, 15-minute deep link from the authenticated destination endpoint.
- Only the SHA-256 digest of the token is persisted.
- The configured MAX webhook must authenticate `X-Max-Bot-Api-Secret` before reading the event.
- A valid `bot_started` event atomically consumes the token and stores the positive `user.user_id` as the active recipient.
- Delivery uses Relayform's `MAX_BOT_TOKEN`, never user-supplied credentials.
- The browser can read pending/active status but never reads the stored recipient.

## Interface states

- `idle`: MAX is an unselected service badge.
- `saving`: the form and pending destination are persisted.
- `activation`: the deep link and status-check action are visible.
- `checking`: activation status is being refreshed.
- `active`: the editor returns to the cabinet.
- `error`: a safe retryable or validation message is shown.
