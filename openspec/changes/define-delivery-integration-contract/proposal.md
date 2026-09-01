## Why

Relayform needs an explicit backend contract before implementing delivery of website-form data to Telegram, VK, MAX and e-mail. Without it, the Cabinet cannot safely decide which configuration inputs to render or what delivery data must be stored, encrypted and audited.

## What Changes

- Research the currently documented delivery prerequisites for each supported channel.
- Define a provider-neutral delivery event and integration-configuration contract.
- Document required, conditional and deferred configuration data for the backend task.
- State security, validation, retry and observability boundaries without implementing providers.
- Revise the contract for a Relayform-owned channel model: the service holds provider credentials and a user supplies only a recipient address or identifier.

## Capabilities

### New Capabilities

- `delivery-integration-contract`: Backend-ready contract for receiving a form submission and delivering it to a configured notification channel.

## Impact

- New technical document in `docs/` and delivery-contract OpenSpec specification.
- AI project context and decision log.
- No provider API calls, persistence schema, backend code or credentials are created in this change.
