# Design

## Runtime split

The API remains responsible for authentication, validation and atomically accepting a submission plus delivery job. `RUN_DELIVERY_WORKER=false` prevents it from starting or waking its local poller. The default remains enabled so isolated tests and database-free development keep their existing immediate-delivery behavior.

The new worker entrypoint requires `DATABASE_URL`, creates a `PostgresDeliveryRepository`, registers only transports backed by complete Relayform runtime credentials and runs the existing non-overlapping `DeliveryWorkerRunner`. PostgreSQL leasing with `FOR UPDATE SKIP LOCKED` remains the concurrency boundary, so multiple worker replicas may safely compete later without changing the job contract.

## Lifecycle

The standalone runner keeps its polling timer referenced so the process stays alive. `SIGTERM` and `SIGINT` stop further polling and close the PostgreSQL pool once. Existing attempt leases recover unfinished work after expiry if the process terminates during a send.

## Deployment

Production Compose runs `backend` with `RUN_DELIVERY_WORKER=false` and adds a private `worker` service built from the backend image. The worker reads both application configuration and `APP_TOKENS_FILE`, receives the same `DATABASE_URL`, depends on healthy PostgreSQL and exposes no port. The API remains the migration owner; transient missing-table errors at simultaneous first startup are swallowed by the poll cycle and retried after the backend migration completes.
