## BFF boundary

Browser code calls only same-origin `/api` route handlers. Authentication handlers forward credentials to Fastify and store the returned token in `relayform_session`. Authenticated handlers read that cookie and add `Authorization: Bearer` only on the server. Backend error bodies are mapped to stable frontend errors; arbitrary diagnostics are not forwarded.

Project creation deliberately strips the one-time backend API key from its browser response. API-key presentation and secure acknowledgement require a dedicated flow.

## Cabinet state

`CabinetPage` is the smallest client boundary that owns loading and project selection. It lives in `widgets/cabinet`: Next.js reserves `src/pages` for Pages Router and treats a same-path FSD page slice as a conflicting route. It first loads projects. An empty account receives a first-project form. A selected project triggers form loading. Unauthorized responses navigate to login; retryable failures stay on the page with a retry action. Existing semantic theme tokens and responsive layout are retained.

## Runtime configuration

`RELAYFORM_API_URL` defaults to `http://localhost:3001` for local development and is set to `http://backend:3001` for Compose. It is never exposed through a `NEXT_PUBLIC_` variable.

## Validation

Route-handler tests mock backend fetch and Next cookies. UI tests cover request lifecycle and navigation. Coverage configuration includes new TypeScript API modules and widget composition code.
