## 1. Durable replay

- [x] 1.1 Add replay audit persistence and repository contracts for safe failure listing.
- [x] 1.2 Implement atomic failed-to-queued replay with attempt-budget reset and concurrency protection.
- [x] 1.3 Add owner-scoped list/replay endpoints and worker wake behavior.

## 2. Cabinet integration

- [x] 2.1 Add thin BFF routes and a typed failed-delivery entity.
- [x] 2.2 Add the responsive recent-failures block with per-row replay states.
- [x] 2.3 Cover empty, success, conflict, failure and unauthorized paths.

## 3. Documentation and gates

- [x] 3.1 Update backend contract, SDD and project context.
- [x] 3.2 Run coverage, typecheck, lint, build, Compose, diff and strict OpenSpec validation.
