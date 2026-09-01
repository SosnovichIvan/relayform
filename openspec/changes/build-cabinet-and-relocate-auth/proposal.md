## Why

Login and Registration are entry points from the marketing landing, not a Dashboard. The current `02 • Dashboard` page therefore has the wrong purpose. At the same time, Relayform needs the first cabinet design for managing connected forms and confirmation-email templates.

## What Changes

- Recreate Login and Registration Light/Dark desktop/mobile frames on `01 • Landing` and remove the former Dashboard page.
- Create a new `02 • Cabinet` page in Figma.
- Create the first Light and Dark desktop cabinet views:
  - forms overview with per-form delivery statistics and edit/delete actions;
  - create/edit form with delivery-destination selection;
  - confirmation-email templates list;
  - create/edit confirmation-email template with redirect URL after confirmation.
- Add 390 px mobile references for each cabinet scenario in both themes, preserving the same form and email-management paths.
- Refine mobile form-card actions and model a selected delivery channel as a configuration input with a reversible clear control.
- Keep the screens as design contracts; no real deletion, API, persistence, sending or authentication behavior is implemented.

## Capabilities

### New Capabilities

- `user-cabinet`: Visual cabinet for form lifecycle, message statistics and confirmation-email template management.

### Modified Capabilities

- `auth-ui`: Login and Registration live with the marketing landing, not on the cabinet page.

## Impact

- Figma pages `01 • Landing` and `02 • Cabinet`; former `02 • Dashboard` is removed.
- AI context and decision log.
- No code, auth backend, message delivery or template persistence changes.
