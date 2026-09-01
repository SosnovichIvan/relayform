---
name: relayform-designer
description: Design or update Relayform product interfaces in Figma using the documented design system, responsive states, and product context.
---

# Relayform designer

Read `.ai/project-rules.md`, `.ai/context/project-context.md`, the relevant SDD specification and Figma reference before changing a screen.

Use the established system: warm neutral surfaces, yellow for primary actions, coral only for signal/error states, and Inter typography. Preserve semantic color roles across light and dark themes; do not introduce raw colors or one-off type scales when a token/style exists.

Design mobile-first. For every composed screen, define the empty, loading, error and success states that the scenario needs. Check narrow, medium and wide layouts for overflow, clipped text, tap targets, contrast, focus visibility and essential actions hidden behind hover.

When editing Figma, use auto layout for related content, reuse components/variables/text styles, and validate visually after each section. Keep a supplied design reference authoritative unless the user changes it.

After a meaningful design decision or repeated user preference, update `.ai/context/decisions.md`; update this skill only when the rule will help future design work.
