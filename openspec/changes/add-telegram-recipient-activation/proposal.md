## Why

Telegram delivery requires a chat identifier, but Relayform users should not discover or enter internal Telegram IDs manually. The bot-start flow can bind a destination after the user explicitly opens the Relayform bot.

## What Changes

- Create short-lived, one-time Telegram activation links for an owned pending destination.
- Accept protected Telegram webhook updates containing `/start <code>`.
- Bind the update chat ID to the destination and mark it active without exposing the ID in activation responses.

## Non-goals

- Webhook registration automation, group/channel activation, activation confirmation messages and other providers are not included.
