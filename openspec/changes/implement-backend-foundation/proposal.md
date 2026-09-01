## Why

Frontend demo flows now need a stable backend boundary for authentication, forms, destinations, confirmation templates and health/readiness without yet claiming provider delivery support.

## What Changes

- Add an isolated TypeScript backend service with PostgreSQL migrations and a queue boundary.
- Implement authenticated ownership-scoped CRUD for projects, forms, recipient-only destinations and e-mail templates.
- Implement health/readiness endpoints, hashed project API keys, idempotent event intake and redacted delivery-attempt records using a mock transport.
- Extend production Compose with backend, worker, PostgreSQL and a non-public queue; only backend/worker receive `APP_TOKENS_FILE`.

## Non-goals

- No real Telegram, VK, MAX or e-mail sending.
- No user-provided provider secrets, no WhatsApp channel and no production credential provisioning.
