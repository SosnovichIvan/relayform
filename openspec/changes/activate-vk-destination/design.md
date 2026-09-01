# Design

## Activation

`POST /v1/destinations/:destinationId/vk-activation` is owner-scoped and accepts only a pending VK destination. It replaces any previous activation with a cryptographically random 15-minute code, stores only its SHA-256 digest and returns the public community conversation URL, the code and expiry. The code is an activation capability, not a provider credential.

The user opens the Relayform VK community and sends `/start <code>`. VK posts a `message_new` callback containing the sender ID. Relayform validates the configured community ID and callback secret, atomically consumes the current unexpired digest and activates the destination with that sender ID. Callback confirmation returns the configured confirmation string only for the expected community. All processed event callbacks return VK's plain `ok` acknowledgement.

`GET /v1/destinations/:destinationId/vk-activation` returns only owner-scoped pending/active status. This lets the browser check completion without resaving the server-managed VK recipient.

## Delivery

`VkTransport` sends `application/x-www-form-urlencoded` requests to the fixed `https://api.vk.com/method/messages.send` endpoint with API version `5.199`, the Relayform community access token, confirmed numeric `peer_id`, a random signed 32-bit `random_id` and text up to 9000 characters. A successful numeric VK response becomes the provider message ID. Network, HTTP `429`/`5xx` and VK rate-limit errors are retryable; invalid input, permission failures and other provider rejections are terminal. Provider bodies, tokens and recipients never enter public diagnostics.

## Frontend

Telegram and VK are service-managed destinations and never expose recipient inputs. Saving a new pending VK destination requests activation, shows the community link and exact command, and offers a status-check action. When status is active the editor returns to the cabinet. Manual e-mail/MAX recipients keep their current input behavior. Route files remain thin BFF boundaries.
