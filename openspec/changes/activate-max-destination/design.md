# Design

## Activation

`POST /v1/destinations/:destinationId/max-activation` is owner-scoped and accepts only a pending MAX destination. It replaces any previous activation with a cryptographically random 15-minute token, stores only its SHA-256 digest and returns `https://max.ru/<botName>?start=<token>` with its expiry. The payload is a one-time activation capability and contains no provider credential or private user data.

MAX sends `bot_started` to `POST /v1/integrations/max/webhook`. Relayform compares `X-Max-Bot-Api-Secret` with the configured webhook secret, validates the token and positive `user.user_id`, then atomically consumes the current unexpired digest and activates the destination. The endpoint acknowledges validly authenticated events even when they do not activate a destination, preventing provider retries from revealing activation state.

`GET /v1/destinations/:destinationId/max-activation` exposes only owner-scoped pending/active status. The browser can therefore check completion without reading or overwriting the server-managed recipient.

## Delivery

`MaxTransport` posts JSON to the fixed `https://platform-api2.max.ru/messages?user_id=<recipient>` endpoint with the Relayform bot token in the `Authorization` header and text limited to 4000 characters. Network, HTTP `429` and `5xx` failures are retryable; invalid input and other provider rejections are terminal. The current documented response exposes a message timestamp but no explicit message identifier, so a successful result uses a namespaced provider receipt marker derived from that timestamp. Provider bodies, tokens and recipients never enter public diagnostics.

## Frontend

Telegram, VK and MAX are service-managed destinations and never expose recipient inputs. Saving a new pending MAX destination requests activation, shows the bot deep link and offers a status-check action. When status is active the editor returns to the cabinet. E-mail remains manually configured. Route files remain thin BFF boundaries.
