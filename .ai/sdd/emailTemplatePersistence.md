# Confirmation email persistence

## Goal

Replace the demo confirmation-email editor with persisted project-scoped templates and a real list lifecycle.

## Data

An email template stores `subject`, `body`, `theme` (`light` or `dark`) and an absolute HTTP(S) `redirectUrl`. The confirmation CTA label, Relayform wordmark, structure and `relayform.ru` attribution are fixed product elements and are not editable.

## Flow

The e-mail section loads owned projects, then templates for the selected project. Users can create, open, update and confirm deletion of a template. The editor keeps the preview above the scrollable fields on mobile and alongside them on desktop. Save returns to the refreshed list.

## Boundaries and states

Fastify performs ownership and payload validation. Same-origin BFF handlers forward only allow-listed data through the `HttpOnly` session. `features/manageEmailTemplate` owns editor behavior; `widgets/emailTemplates` owns project selection and list composition. Loading, empty, saving, validation, error and unauthorized states are explicit.
