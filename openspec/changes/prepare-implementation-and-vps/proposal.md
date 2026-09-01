## Why

Relayform has approved product, delivery and design contracts but no executable implementation backlog or repeatable production-deployment baseline. The team needs clear frontend/backend handoff tasks and a VPS bootstrap path before code begins.

## What Changes

- Add SDD-ready frontend and backend implementation task documents with dependencies and acceptance criteria.
- Add a VPS deployment guide and a configurable bootstrap script for Ubuntu/Debian, Docker Compose, Nginx and Let's Encrypt.
- Add a versioned example configuration and Nginx template; keep secrets outside Git.
- Add an administrator guide for obtaining and rotating provider credentials used by the MVP token file.
- Align architecture/product documentation with Relayform-owned provider credentials.

## Non-goals

- Provisioning a real VPS, changing DNS, issuing a live certificate or deploying the application.
- Choosing a database, queue, e-mail transport, VPS provider or CI platform.
- Implementing the frontend, backend, Dockerfile or production Compose application service.

## Impact

- New `docs/`, `.ai/sdd/` and `ops/` artifacts.
- New deployment automation capability specification.
- No production infrastructure is changed by this task.
