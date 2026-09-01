---
name: relayform-frontend
description: Implement Relayform frontend features with Next.js, TypeScript, Tailwind v4, and Feature-Sliced Design after an approved SDD specification.
---

# Relayform frontend

Read `.ai/project-rules.md`, `.ai/context/project-context.md` and the relevant `.ai/sdd/<featureName>.md` before implementation. If no specification exists for a substantial feature, create one before coding.

Keep route files thin: compose pages/widgets in `src/app`; put business behavior in the appropriate FSD slice and expose it through the slice public API. Use semantic theme tokens rather than raw colors. Implement loading, empty, error and success states that are relevant to the scenario.

In this Next.js App Router repository, do not create FSD slices under physical `src/pages`: Next reserves that directory for Pages Router and produces conflicting routes. Put full route composition in a named `widgets/<domain>` slice and keep `src/app/**/page.tsx` thin. Do not re-export modules using `next/headers`, cookies or other server-only APIs from a barrel imported by client components; keep the BFF handler in `shared/api` or another server-only import graph.

Use server components by default. Isolate the smallest interactive boundary in a client component. Add or update focused tests and run lint, type-check and the relevant test suite with statement, branch, function and line coverage of at least 90% before handoff.

Provider-managed recipient identifiers such as Telegram `chat_id`, VK sender ID and MAX `user_id` are never rendered as editable inputs and never sent through the generic destination PATCH flow. Use the provider activation BFF and its status contract instead.

Operational delivery lists in the cabinet expose only identifiers needed for the action plus form/provider, stable error code and timestamp. Never render or request message content, recipient data, destination/event/idempotency identifiers or raw provider diagnostics for replay UI.

After implementation, update project context and this skill only when the change establishes a durable frontend convention.
