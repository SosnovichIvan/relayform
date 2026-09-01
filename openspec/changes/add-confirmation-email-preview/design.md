## Context

The Cabinet already has a desktop and mobile confirmation-email editor in Light and Dark. The preview is a content block within that editor, not a separate dashboard page.

## Decisions

- The email has a fixed Relayform-branded structure: wordmark, title, body, single confirmation CTA, support line and footer attribution/link.
- The template author changes only the title/body text and the selected Light/Dark theme. Brand, CTA hierarchy, attribution and landing link stay fixed.
- The desktop preview sits next to the editing fields where space allows. On mobile, it is a fixed visual context above the editable region; the fields and save action form the scrollable content below it.
- Use existing semantic variables and Inter styles; no new palette or reusable component is introduced.

## Validation

- Inspect existing editor frames, variables, text styles and related layout conventions before editing.
- Verify each Light/Dark preview visually for clipped text, readable contrast, link visibility and one unambiguous primary CTA.

## Non-goals

- HTML email implementation, inbox-client compatibility, responsive e-mail markup and personalization variables.
