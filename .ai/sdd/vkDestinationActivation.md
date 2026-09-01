# VK destination activation

## Objective

Connect a form's VK notification recipient through first contact with the Relayform community and deliver text using Relayform-owned credentials.

## Contract

- A VK destination is created with internal placeholder recipient `pending` and `pendingActivation` status.
- The owner requests a 15-minute activation code and sends `/start <code>` to the configured Relayform VK community.
- Only a callback matching `VK_COMMUNITY_ID` and `VK_CALLBACK_SECRET` may consume the digest and persist `object.message.from_id`.
- `VK_CALLBACK_CONFIRMATION_CODE` is returned only for the Callback API confirmation event of the configured community.
- The browser may read only owner-scoped activation status; it never writes a VK recipient.
- Delivery uses VK API `5.199`, a community token, numeric peer ID, unique random ID and messages no longer than 9000 characters.
- All failures and responses are redacted; service credentials remain in the backend environment.

## UI states

- Pending: community link, exact command, 15-minute note and “Проверить подключение”.
- Still pending: keep the instruction and show a neutral status.
- Active: navigate to the cabinet.
- Error/unavailable: show the existing safe form error without provider diagnostics.

## Verification

Backend and frontend tests cover ownership, expiry, one use, callback authentication, confirmation handshake, provider classification and UI status checking. Every configured coverage metric remains at least 90%.
