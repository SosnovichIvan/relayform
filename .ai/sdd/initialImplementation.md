# Initial implementation

## Goal and scope

First production-ready vertical slice: account, project form, recipient-only destination activation, event intake, delivery attempt status and confirmation-email template management. Landing and Cabinet follow the approved Figma references.

## User scenarios

1. Owner registers, creates a form and receives a project API key.
2. Owner connects a recipient: starts Relayform bot or verifies a contact address; the destination becomes active only after provider-specific activation.
3. Website posts an idempotent event; Relayform records a submission and independently queues each active destination.
4. Owner sees delivery status and redacted error details.
5. Owner creates a confirmation template with fixed Relayform attribution and variable Light/Dark appearance and copy.

## UI states

Every auth, form, destination, template and delivery screen defines loading, empty, validation error, transport/API error and success state. Mobile email preview remains fixed above the scrolling editing area.

## Shared API/data contract

- `eventId`, `formId`, typed `fields`, `occurredAt`, optional safe context are accepted from a website.
- `Destination` contains provider, recipient metadata, activation/status and config version; it has no user-editable provider credential.
- `DeliveryAttempt` contains state, attempt number, provider message ID and redacted diagnostic.
- Full endpoint payloads, pagination and error taxonomy are versioned before feature implementation.

## FSD slices

`entities/form`, `entities/destination`, `entities/emailTemplate`, `entities/delivery`, `entities/user`; `features/authentication`, `features/manageForm`, `features/connectDestination`, `features/manageEmailTemplate`; `widgets/formList`, `widgets/emailEditor`, `widgets/deliveryOverview`; thin routes in `src/app`.

## Acceptance and verification

- API authorization, ownership, idempotency and recipient activation are integration-tested.
- Frontend runs lint, type-check, focused tests and responsive/accessibility review.
- Production service has `/health` and is container-ready for the VPS contract in `docs/vpsDeployment.md`.
