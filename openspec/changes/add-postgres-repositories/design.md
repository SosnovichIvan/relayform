## Repository boundary

The API will select a PostgreSQL-backed repository when `DATABASE_URL` is present; isolated tests continue to use the in-memory repository. A thin repository interface prevents route handlers from knowing which storage implementation is active.

Migrations remain ordered SQL files. A migration runner records applied versions in `schema_migrations` and runs before the API starts in production deployment.

## Safety

Database URLs are supplied through runtime environment files and are never returned or logged. SQL calls use parameterised queries. Readiness reports unavailable when configured persistence cannot be reached.

## Validation

Unit tests keep the 90% gate. A Compose smoke command verifies the migration runner can resolve its configured services.
