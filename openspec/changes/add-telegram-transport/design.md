## Transport contract

Every text transport accepts a recipient identifier and a fully formatted message, and returns a provider message ID. Provider-specific HTTP shapes remain inside adapters. Failures use stable internal codes plus a retryable flag; raw provider bodies, request URLs, tokens and complete recipients are not exposed.

## Telegram adapter

The adapter calls the official HTTPS `bot<token>/sendMessage` endpoint with JSON `chat_id` and `text`. It validates the official 1–4096 character text boundary before network I/O. HTTP `429` and `5xx` failures are retryable; other provider rejections are terminal until configuration changes.

The token comes only from `TELEGRAM_BOT_TOKEN` in `APP_TOKENS_FILE`. Tests inject a fake fetch implementation and never access the network.

## Validation

Tests cover successful delivery, input bounds, provider rejection, retry classification and redacted error output. The backend 90% coverage gates remain mandatory.
