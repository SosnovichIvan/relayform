# Change: Activate and deliver to VK destinations

## Why

VK can be selected in the form editor, but the destination remains pending and no VK transport exists. Asking for a numeric user ID alone does not prove consent or ownership and could route private lead data to an unrelated account.

## What changes

- Replace manual VK recipient input with a Relayform-issued one-time activation code and a configured community conversation link.
- Consume the code only from a secret-protected VK community `message_new` callback and persist the sender ID as the recipient.
- Support the VK Callback API confirmation handshake without exposing its confirmation code.
- Register a community-token-backed `messages.send` transport with safe error classification.
- Let the form editor display the activation instruction and check the resulting destination status without resaving service-managed recipient data.
- Document the required VK community, Callback API and runtime configuration.

## Out of scope

- Group-chat destinations, VK ID OAuth, attachments, rich keyboards, callback event replay persistence and automatic webhook provisioning are not included.
