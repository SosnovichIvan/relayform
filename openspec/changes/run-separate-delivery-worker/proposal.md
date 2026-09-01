# Change: Run delivery in a separate worker process

## Why

Delivery currently runs inside the Fastify API process. This couples API availability to provider work, starts a competing poller in every future API replica and prevents delivery capacity from being scaled or restarted independently even though PostgreSQL already provides durable jobs and leases.

## What changes

- Add a dedicated backend workspace entrypoint that polls PostgreSQL delivery jobs and uses the existing transport registry.
- Make in-process delivery execution explicitly configurable, preserving it for database-free development and tests while disabling it in the production API container.
- Add a production Compose worker service with provider secrets and database access but no public port.
- Add graceful worker shutdown and document the resulting runtime topology.

## Out of scope

- Manual dead-letter replay, a cabinet retry action, queue metrics, autoscaling policy, Redis and e-mail-verification background delivery are not included.
