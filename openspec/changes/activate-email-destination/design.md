# Design

## Activation lifecycle

`POST /v1/destinations/:destinationId/email-activation` requires the owner session, an e-mail destination in `pendingActivation`, configured Resend credentials and `PUBLIC_APP_URL`. It normalizes the stored address, replaces any previous pending activation with a new 32-byte base64url token digest and sends a fixed ownership message. The response contains `sent` and expiry only, never the address or token.

`POST /v1/destination-email-activations/confirm` accepts the opaque token. Persistence atomically changes a current pending activation to confirmed and activates the matching e-mail destination. Unknown, expired and previously consumed tokens return distinct stable states without recipient data. PostgreSQL is authoritative in production; the in-memory equivalent supports isolated development/tests.

Updating an active e-mail destination to a different address resets its state to `pendingActivation`. Saving the unchanged normalized address preserves its current state.

## Delivery boundary

Destination resolution for public events requires `status=active` for every provider. A pending destination is indistinguishable from an unknown/foreign destination to the project API. The e-mail transport implements the existing text-delivery contract, validates the recipient/message, escapes tenant content and sends a fixed Relayform subject/HTML/plain-text message through Resend. Network, `429` and `5xx` failures are retryable; invalid input and provider `4xx` rejection are terminal. Raw response bodies, recipient and API key are never included in delivery errors.

## Frontend

After saving a pending e-mail destination, the form editor requests activation and shows that the confirmation message was sent. Telegram keeps its bot deep link. The public `/activate-email` server route consumes the token without client state and renders confirmed, invalid, expired, already-used or unavailable status in the existing semantic visual system.
