# Change: Activate and deliver to e-mail destinations

## Why

Owners can configure an e-mail recipient, but it remains pending forever and the delivery registry has no e-mail transport. Allowing delivery before ownership confirmation would let a project send lead notifications to an arbitrary third-party address.

## What changes

- Send a fixed Relayform ownership message for a pending e-mail destination.
- Persist a digest-only, 15-minute, single-use activation token and activate the destination atomically.
- Add a public, branded activation result route with safe states.
- Register a Resend-backed e-mail notification transport from Relayform-owned runtime credentials.
- Reject event delivery to every pending destination, including e-mail and Telegram.
- Extend the form editor with e-mail activation-sent feedback.
- Return an active e-mail destination to pending state whenever its recipient address changes.

## Out of scope

- Resend cooldown history, custom notification HTML/subject, attachments, inbound provider webhooks and e-mail suppression-list synchronization are not included.
