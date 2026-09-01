## 1. Durable activation

- [x] 1.1 Add the e-mail destination activation migration and in-memory/PostgreSQL stores.
- [x] 1.2 Add owner-scoped issue and public single-use confirmation endpoints.
- [x] 1.3 Require active destination state during event intake.

## 2. E-mail notification transport

- [x] 2.1 Add safe fixed rendering, Resend sending and failure classification.
- [x] 2.2 Register the transport only from complete runtime credentials.

## 3. Frontend activation

- [x] 3.1 Add BFF handlers and trigger activation from the form editor.
- [x] 3.2 Add the server-only public activation result route and states.
- [x] 3.3 Cover activation sent, confirmed, invalid, expired, used and unavailable behavior.

## 4. Documentation and gates

- [x] 4.1 Update project context and integration/provider documentation.
- [x] 4.2 Run both coverage suites, typecheck, lint, build, Compose, diff and strict OpenSpec gates.
