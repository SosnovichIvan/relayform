# Change: Send confirmation e-mails

## Why

Project owners can persist confirmation templates, but an integrated website cannot yet request a confirmation message or complete a confirmation through its link.

## What changes

- Add a project-API-key protected endpoint that requests a confirmation e-mail from an owned template.
- Issue a short-lived, single-use opaque token while persisting only its digest.
- Add a Relayform-owned Resend mail adapter using runtime service credentials.
- Consume confirmation tokens atomically and return only the template's validated redirect URL.
- Add a public Relayform result route for successful, expired, invalid and already-used links.
- Add rate limiting, idempotency and redacted failure handling for confirmation requests.

## Out of scope

- Phone verification, custom HTML/CTA/branding, bulk mail, marketing mail, provider webhooks and background e-mail retry are not included.
