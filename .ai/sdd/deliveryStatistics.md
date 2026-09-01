# Delivery statistics

## Goal

Expose the persisted delivery pipeline as safe 30-day operational statistics in the owner's Cabinet.

## Data contract

The project aggregate contains `total`, `delivered`, `failed`, `queued` and `forms`. A form group adds `formId` and provider groups; provider values remain Telegram, VK, MAX and e-mail. Counts are non-negative integers. The contract contains no recipient, message, destination, idempotency or diagnostic fields.

## UI states

The selected project loads forms and statistics as one retryable unit. Summary cards wrap from one to four columns. Form cards remain compact on mobile, actions do not stretch, and provider counts wrap without overlap. Empty projects and forms use explicit zero values.

## Verification

Repository aggregation, ownership, period filtering, BFF sanitization and Cabinet states require focused tests. All configured coverage metrics remain at least 90%.
