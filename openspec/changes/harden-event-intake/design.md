## Event boundary

The form owner receives a project API key only once at project creation. The API stores only its scrypt hash. For MVP verification, the in-memory store compares the presented key against project hashes using the existing constant-time verification helper.

`POST /v1/events` requires `x-api-key` and `x-idempotency-key`. The provided destination must belong to the authenticated project. The idempotency key is namespaced by project and destination so two projects cannot collide. Responses expose a delivery attempt identifier and state, never recipient data or credentials.

## Validation

Integration tests cover missing/invalid API keys, cross-project destination access, accepted intake and duplicates. Existing 90% coverage gates remain mandatory.
