## 1. MAX activation lifecycle

- [x] 1.1 Add durable digest-only MAX activation persistence.
- [x] 1.2 Add owner-scoped issue/status endpoints and a secret-protected MAX webhook.
- [x] 1.3 Activate only from a valid current `bot_started` payload.

## 2. MAX delivery

- [x] 2.1 Implement the fixed MAX messages adapter and safe failure classification.
- [x] 2.2 Register MAX only from complete Relayform runtime configuration.

## 3. Frontend integration

- [x] 3.1 Add the MAX activation BFF and service-managed destination behavior.
- [x] 3.2 Show deep-link instructions and status checking in the form editor.
- [x] 3.3 Cover pending, active, unavailable and invalid flows.

## 4. Documentation and gates

- [x] 4.1 Update runtime examples, provider instructions, SDD and project context.
- [x] 4.2 Run coverage, typecheck, lint, build, Compose, diff and strict OpenSpec validation.
