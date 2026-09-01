# Separate delivery worker

## Purpose

Move provider delivery polling out of the production Fastify process while retaining PostgreSQL as the durable queue and lease authority.

## Contract

- Production API uses `RUN_DELIVERY_WORKER=false` and only accepts durable jobs.
- Database-free development and tests keep API-local polling by default.
- The standalone worker refuses to start without `DATABASE_URL`.
- It uses `PostgresDeliveryRepository`, `TransportDeliveryWorker` and the runtime transport registry.
- The polling timer keeps the worker process alive and never overlaps drain passes.
- `SIGTERM` and `SIGINT` stop polling and close the database once.
- The worker receives `APP_ENV_FILE` and `APP_TOKENS_FILE`, exposes no network port and can later be replicated safely through PostgreSQL leases.
