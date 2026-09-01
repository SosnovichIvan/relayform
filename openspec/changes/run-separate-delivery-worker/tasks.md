## 1. Worker runtime

- [x] 1.1 Add a tested standalone worker lifecycle around PostgreSQL and the transport registry.
- [x] 1.2 Add a worker entrypoint with required database configuration and graceful signal shutdown.
- [x] 1.3 Make API-local polling configurable without changing database-free defaults.

## 2. Production deployment

- [x] 2.1 Add the private worker service and disable polling in the production API container.
- [x] 2.2 Document runtime ownership, secrets, scaling and recovery behavior.

## 3. Validation

- [x] 3.1 Cover lifecycle, disabled API dispatch and configuration branches.
- [x] 3.2 Run coverage, typecheck, lint, build, Compose, diff and strict OpenSpec validation.
