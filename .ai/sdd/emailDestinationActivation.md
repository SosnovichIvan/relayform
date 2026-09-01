# E-mail destination activation

## Goal

Make e-mail a verified Relayform notification destination and a real worker transport without accepting user-owned provider credentials.

## Contract

A pending e-mail recipient receives a fixed ownership message from Relayform. Its 15-minute token is random, digest-only and single-use. Confirmation atomically activates the destination. Public event intake resolves only active destinations. The notification transport uses `EMAIL_PROVIDER_API_KEY` and `EMAIL_FROM_ADDRESS` from server runtime and sends escaped fixed-brand content.

## UI states

The form editor distinguishes Telegram bot activation from e-mail message activation. The public result page supports confirmed, invalid, expired, already-used and unavailable states in Light/Dark semantic roles. No token or recipient appears in client state or rendered diagnostics.

## Verification

Activation persistence, ownership, active-only intake, provider classification, BFF mapping, editor feedback and public result states require focused tests with every configured coverage metric at least 90%.
