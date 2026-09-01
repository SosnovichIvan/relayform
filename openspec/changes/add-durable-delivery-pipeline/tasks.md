## 1. Durable schema

- [x] 1.1 Add submissions, upgraded delivery attempts and claimable delivery jobs migrations.
- [x] 1.2 Add indexes and project-scoped idempotency constraints.

## 2. Repository

- [x] 2.1 Add asynchronous in-memory and PostgreSQL delivery repository contracts.
- [x] 2.2 Implement atomic intake, leased claim, safe completion and status lookup.

## 3. Runtime

- [x] 3.1 Select PostgreSQL delivery repository when `DATABASE_URL` is configured.
- [x] 3.2 Preserve automatic single-process worker execution and duplicate suppression.

## 4. Verification

- [x] 4.1 Run tests, coverage, lint, typecheck, build and Compose validation.
