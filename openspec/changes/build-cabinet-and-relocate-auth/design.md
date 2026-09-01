## Context

Relayform is a service for receiving website-form data, delivering it to chosen channels and optionally verifying contacts. The existing Dashboard page only holds entry auth forms. The user needs the page removed, forms placed with the landing and a real cabinet design begun.

## Goals / Non-Goals

**Goals:**

- Make the information architecture clear: Landing + Auth entry → Cabinet.
- Let a cabinet user see connected forms, delivery volume/statistics, edit and delete affordances.
- Let a user list, create and edit confirmation-email templates.
- In form creation, present destination channels for received data.
- In template creation, present subject, email content, confirmation action and post-confirmation redirect URL.
- Produce comparable Light and Dark desktop and 390 px mobile references using existing tokens.

**Non-Goals:**

- Functional forms, destructive confirmation dialogs, charts based on real data, webhooks, actual message templates, sending, WYSIWYG editor or backend models.

## Decisions

- `02 • Dashboard` is deleted after auth frames are recreated on `01 • Landing`; a separate `02 • Cabinet` is created rather than repurposing the wrong page.
- Cabinet navigation has two main items: `Формы` and `Письма подтверждения`.
- Forms overview uses cards with status, destination tags, 30-day delivery total and delivery rate. Edit and delete are visible secondary actions; delete uses coral signal role only.
- Form editor uses a text name, site endpoint/example field and multi-select-looking destination tiles: Telegram, VK, MAX and E-mail. It avoids implying all integrations are configured or active.
- Email-template editor uses a form name association, subject, body preview/textarea, confirmation button label and redirect URL. This concretely covers the requested feedback/confirmation email and post-click link.
- Mobile Cabinet uses a compact top bar and two-item navigation control. Statistics form a vertical stack; card data appears before its actions; destination options wrap into touch-friendly targets. Form and email editors use one column and a full-width primary action.
- Form destination selection is a reversible state: an unselected channel is a compact badge; selecting it reveals a channel-specific configuration input with a clear `×` control that restores the badge. The exact configuration fields are intentionally left neutral until the integration contract is defined.
- Mobile form-card actions are compact secondary controls rather than equal-width primary buttons. Destination choices use a vertical stack on narrow screens to avoid overlap.

## Risks / Trade-offs

- [Compact mobile surfaces] → show navigation inline rather than a persistent sidebar, while retaining desktop frames as the wide-layout reference.
- [Statistics could be read as real] → use labels `За 30 дней` and clearly present them as dashboard examples.
- [Delete action could imply immediate destructive behavior] → show only an affordance; no modal or behavior is specified.

## Migration Plan

Figma-only update. Recreate auth on Landing before removing the Dashboard page. Rollback via Figma Version History; no production data is affected.
