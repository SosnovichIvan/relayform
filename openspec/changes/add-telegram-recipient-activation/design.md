## Activation link

An authenticated owner requests activation for a Telegram destination. Relayform generates a cryptographically random base64url code no longer than Telegram's 64-character limit, stores only its SHA-256 digest with destination/owner/expiry, and returns `https://t.me/<botUsername>?start=<code>`. Codes expire after 15 minutes and are consumed once.

## Webhook boundary

Telegram posts updates to a public endpoint. Relayform requires an exact `X-Telegram-Bot-Api-Secret-Token` match against `TELEGRAM_WEBHOOK_SECRET`. Only private-message-shaped `/start <code>` updates with a usable chat ID are processed. Invalid, expired or repeated codes return a generic success response so webhook retries and activation-token oracles are avoided.

On valid consumption, the internal owner reference authorizes updating that destination's recipient to the chat ID and status to `active`. The webhook response never returns the chat ID, code, bot token or destination data.

## Validation

Tests cover digest-only storage behaviour, expiry, one-time consumption, ownership, webhook authentication and activation. Existing 90% coverage gates remain mandatory.
