# Relayform agent entrypoint

Read and follow [.ai/project-rules.md](.ai/project-rules.md).

## OpenSpec gate — mandatory

Use OpenSpec for every task in this repository. Before any implementation, design change, review-driven fix or configuration change:

1. Create or update `openspec/changes/<changeId>/` with a proposal, design where needed, tasks and affected specs.
2. Validate the change package against the project OpenSpec workflow.
3. Begin work only after validation passes and the task list is explicit.

Do not bypass this gate for seemingly small tasks. Update the OpenSpec change alongside implementation and validate it again before handoff. The SDD files in `.ai/sdd/` may support a change, but OpenSpec is the authoritative workflow.

Use `.ai/skills/frontend` for frontend implementation, `.ai/skills/designer` for design work and `.ai/skills/review` for review requests.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
