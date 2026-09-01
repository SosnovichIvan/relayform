# Local Docker environment

## Goal

Provide a reproducible production-like environment for manual Relayform testing on a developer machine without requiring or exposing provider credentials.

## Runtime contract

- `frontend` builds the root Next.js standalone image, reaches backend only as `http://backend:3001` and publishes `127.0.0.1:3000` by default.
- `backend` builds `apps/api/Dockerfile`, applies all PostgreSQL migrations before Fastify starts, disables its in-process worker and publishes `127.0.0.1:3001` by default.
- `worker` uses the backend image and standalone worker command, receives no published port and starts only after backend readiness.
- `postgres` persists in `relayform-local_postgresLocalData` and publishes `127.0.0.1:5433` for optional local inspection.
- PostgreSQL health gates backend; backend `/ready` gates frontend and worker; frontend `/api/health` gates successful `local:up` completion.

## Secret boundary

Committed defaults use `ops/localAppEnv.example.env` and the empty `ops/serviceTokens.example.env`. A developer may select ignored `ops/serviceTokens.env` through `APP_TOKENS_FILE`; Compose injects it only into backend and worker. `.dockerignore` excludes every local env/token file from image build context.

## Lifecycle

- `npm run local:up` builds, starts and waits for the complete stack.
- `npm run local:down` removes containers/network and preserves database data.
- `npm run local:reset` additionally removes the named PostgreSQL volume and is intentionally destructive to local test data.
- `npm run local:status` and `npm run local:logs` provide diagnostics.

The complete operator workflow and smoke-test checklist live in `docs/localDockerTesting.md`.
