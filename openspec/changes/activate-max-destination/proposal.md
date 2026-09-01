# Change: Activate and deliver to MAX destinations

## Why

MAX can be selected in the form editor, but Relayform currently asks for an unspecified recipient value and has no MAX delivery transport. A raw identifier does not prove that the recipient opened the Relayform bot or consented to receive form submissions.

## What changes

- Replace manual MAX recipient input with a Relayform-issued one-time deep link to the configured MAX bot.
- Consume the token only from a secret-protected MAX `bot_started` webhook and persist the initiating MAX user ID as the recipient.
- Register a bot-token-backed MAX text transport against the current MAX Platform API endpoint.
- Let the form editor show the activation link and check destination status without resaving service-managed recipient data.
- Document bot creation, webhook and runtime configuration.

## Out of scope

- Group chats, attachments, rich content, automatic webhook provisioning and durable storage of all incoming MAX events are not included.
