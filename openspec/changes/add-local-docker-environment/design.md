# Design

## Compose boundary

`dockerCompose.local.yml` builds the same frontend and backend Dockerfiles used by production. It runs `frontend`, `backend`, `worker` and `postgres` on one private Compose network. Frontend, backend and PostgreSQL may be reached from the host only through `127.0.0.1`; the worker has no published port.

The local model has self-contained defaults for ports, database credentials and committed example environment files. Developers can override non-secret settings through Compose interpolation and can opt into real providers by pointing `APP_TOKENS_FILE` at the ignored `ops/serviceTokens.env` file. Empty example token values keep external transports disabled.

## Startup and health

PostgreSQL readiness gates the backend. The backend image already applies idempotent migrations before starting Fastify; its `/ready` response gates frontend and worker startup. Frontend health uses `/api/health`. Health probes run with Node.js `fetch`, which is available in both Node.js 24 images and does not require additional image packages.

The database uses a dedicated named volume. Normal stop preserves data; the documented reset command explicitly removes the local volume.

## Developer workflow

Root npm scripts provide stable commands for start, stop, logs, status and destructive reset. The guide distinguishes application testing without providers from real delivery testing, documents URLs and health checks, and warns that only the ignored token file may contain real credentials.
