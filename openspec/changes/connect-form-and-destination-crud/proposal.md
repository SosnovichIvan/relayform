## Why

The cabinet can read projects and forms, but its editor still reports demo saves. Users cannot persist a site URL, edit/delete a form or configure its delivery destinations.

## What Changes

- Persist a form `siteUrl` and add an owner-scoped single-form read API.
- Add authenticated BFF handlers for form and destination CRUD plus Telegram activation.
- Connect create/edit/delete UI to the BFF with explicit lifecycle states.
- Support multiple destination inputs and the Telegram bot-link activation flow.

## Non-goals

- VK/MAX/e-mail confirmation flows, delivery statistics, provider credentials and API-key management are not included.
