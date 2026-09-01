## 1. Persistence and token lifecycle

- [x] 1.1 Add the verification migration and matching in-memory/PostgreSQL repositories.
- [x] 1.2 Implement digest-only issuance, idempotency, expiry and atomic single-use consumption.

## 2. E-mail delivery and API

- [x] 2.1 Add fixed safe e-mail rendering and the runtime-injected Resend adapter.
- [x] 2.2 Add authenticated request and public confirmation endpoints with stable responses and rate limits.

## 3. Public confirmation experience

- [x] 3.1 Add the server-only confirmation boundary and branded result states.
- [x] 3.2 Cover redirects and invalid, expired, used and unavailable states.

## 4. Documentation and gates

- [x] 4.1 Update runtime examples, credential/deployment documentation and project context.
- [x] 4.2 Run both coverage suites, typecheck, lint, production build, Compose, diff and strict OpenSpec validation.
