---
name: relayform-review
description: Review Relayform frontend changes for FSD boundaries, Next.js/React rendering correctness, Tailwind tokens, accessibility, responsiveness, and design fidelity when a design reference is provided.
---

# Relayform review

Read `.ai/project-rules.md`, `.ai/context/project-context.md`, the feature specification, and design reference when one is supplied. Report only actionable findings, ranked by impact; do not request stylistic changes already covered by automation.

## Architecture and naming

- Verify FSD layer direction, domain slice names and public API imports.
- Reject business logic in `src/app` route files or `shared` UI primitives.
- Require camelCase for files, folders, functions, hooks, props and variables. React component identifiers remain PascalCase because lowercase JSX is rendered as a native HTML element.

## Rendering and React

- Use stable data IDs for list keys; reject indexes for mutable lists and keys generated at render time.
- Require explicit loading, empty, error and success states where asynchronous or user-visible data needs them.
- Reject side effects, non-deterministic values, network calls and heavy transformations during render; memoize only proven expensive calculations.
- Prefer clear early returns or named conditions over nested ternaries. Ensure `&&` cannot accidentally render `0` or an empty value.
- Keep client boundaries minimal; browser APIs, event handlers and client hooks must not leak into server components.
- Require semantic HTML, accessible names for controls, keyboard operation and visible focus states.

## Tailwind and design validation

- Reject arbitrary raw colors when a semantic design token exists. Confirm dark mode uses the same semantic roles.
- Check mobile-first layout at narrow, medium and wide widths; no horizontal overflow, clipped text, inaccessible controls or hover-only core actions.
- When Figma or another design reference is part of the task, compare hierarchy, spacing, responsive behavior, color roles, type scale, states and interaction affordances. Flag deviations that alter usability or visual system consistency.

After review, add only durable new review checks to this skill and record the decision in context.
