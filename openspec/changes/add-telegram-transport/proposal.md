## Why

Relayform has a provider-neutral delivery queue and deterministic mock worker but no real channel adapter. Telegram is the first MVP channel and establishes the transport contract for later VK, MAX and e-mail adapters.

## What Changes

- Add a provider-neutral text delivery transport contract.
- Add a Telegram `sendMessage` adapter using the Relayform-owned bot token.
- Classify retryable provider failures without exposing tokens or recipient values in diagnostics.

## Non-goals

- Bot activation/deep-link flow, production worker wiring, retry scheduling and other providers are not included in this increment.
