# Decision log

## 2026-08-28 — Initial foundation

- Product name: Relayform.
- Frontend target: Next.js App Router, React, TypeScript, Tailwind CSS v4 and FSD.
- Design system: warm neutral base; yellow primary action; coral reserved for signals/errors; no blue brand accent.
- Typeface: Inter.
- Naming: camelCase for files, folders, functions and data; PascalCase only for React component identifiers and types.

## 2026-08-28 — Landing direction

- The chosen landing direction is **Verification first**: the primary product message is trusted contacts through e-mail and phone confirmation.
- The `Signal flow` concept was rejected and removed from the Landing page.
- The current landing baseline is desktop-only in Light and Dark. Responsive design is intentionally a later change.

## 2026-08-28 — Product positioning correction

- Relayform's primary scenario is fast delivery of feedback or lead-form data from a site to a chosen channel: Telegram, VK, MAX, WhatsApp or e-mail.
- E-mail and phone verification remains a secondary, optional capability.

## 2026-08-29 — Responsive references and auth UI

- The landing hero uses one primary CTA; the secondary «Как это работает →» link is removed.
- The Figma baseline includes 390 px mobile references for the landing and Login/Registration in Light and Dark.
- Login and Registration are visual contracts only; real authentication and validation require a separate implementation change.

## 2026-08-29 — Cabinet information architecture

- Login and Registration references belong to `01 • Landing`; the former Dashboard page was removed.
- The new `02 • Cabinet` has two primary navigation areas: connected forms and confirmation-email templates.
- Cabinet v1 is a Light/Dark desktop visual contract. Functional CRUD, sending, template persistence, statistics data and responsive cabinet layouts remain implementation work.

## 2026-08-29 — Cabinet theme and scenario presentation

- Cabinet scenarios are shown as a 2×2 grid for each theme: overview and editor for forms, then overview and editor for confirmation emails.
- Structural auto-layout wrappers must use transparent fills. Visible containers use semantic surface tokens; this prevents accidental white panels in Dark mode.

## 2026-08-29 — Cabinet mobile adaptation

- Cabinet mobile references use a 390 px viewport, inline `Формы` / `Письма` navigation and no persistent sidebar.
- Statistics stack vertically; form/template cards keep their content above reachable actions; form and email editors keep a single-column flow and a full-width primary action.

## 2026-08-29 — Destination configuration state

- A destination starts as a selectable badge. Once selected, it is represented by a neutral configuration input with a visible `×` control; clearing restores the badge.
- Do not invent integration-specific fields until the delivery contract is defined. On narrow screens, selected inputs and remaining badges are stacked vertically, while card actions remain compact and one-line.
- A selected destination is a field state, not a primary action: it uses an input/elevated surface and a strong border in both themes.

## 2026-08-29 — Delivery integration contract

- Each accepted submission becomes a provider-neutral event and fans out to one independent delivery attempt per active destination.
- Destination metadata may be returned to the Cabinet, but credentials are stored as encrypted secret references and never returned in full.
- The backend generates provider transport details such as VK `randomId`; the Cabinet asks only for provider-specific configuration after the channel is selected.
- Delivery is idempotent by event and destination/configuration version, with bounded retries for transient errors and redacted observable diagnostics.

## 2026-08-29 — Relayform-owned delivery channels

- Provider accounts, bot tokens, API keys and e-mail transport credentials belong exclusively to Relayform. A user never enters or owns them in the Cabinet.
- A destination stores only a confirmed recipient address/identifier and its activation state.
- Manual entry of technical chat IDs is not the primary user flow: Telegram and MAX bind the recipient after a signed bot-start/first-message flow. VK and WhatsApp require explicit recipient permission or consent before activation; e-mail requires address ownership verification.

## 2026-08-29 — Confirmation-email preview

- Confirmation e-mails use a fixed Relayform frame: wordmark, single confirmation CTA and footer attribution with a landing-page link. Authors change message copy and theme, not Relayform attribution or the CTA hierarchy.
- The Light and Dark previews use the same semantic Color variables. Internal auto-layout wrappers remain transparent so a Dark preview cannot inherit a white background.
- Desktop shows the preview in a right column. Mobile keeps it above the fields; only the field and save-action region scrolls beneath the fixed preview.

## 2026-08-29 — Implementation and VPS baseline

- The first implementation is split into explicit frontend and backend task documents, with `.ai/sdd/initialImplementation.md` as the shared API/state/FSD gate.
- Production VPS uses an administrator-run, config-driven Ubuntu/Debian bootstrap: Docker Compose application on loopback, Nginx as the only public proxy and Let's Encrypt for TLS.
- Deployment settings and runtime secrets are separate: only a non-secret config example is versioned; deploy SSH keys and application env files live on the VPS and are readable by the unprivileged deploy user only.

## 2026-08-29 — MVP provider token storage

- Provider credentials are stored on the VPS in a dedicated `APP_TOKENS_FILE`, separate from deployment settings and other application environment values.
- Docker Compose passes this file only to backend/worker through `env_file`; frontend containers and client-facing APIs do not receive the values.
- The repository contains only `ops/serviceTokens.example.env`; filled token files are ignored and must be owned by the unprivileged deploy user with mode `600`.

## 2026-08-29 — Provider credential operations

- `docs/providerCredentialsGuide.md` is the administrator runbook for issuing, testing and rotating Relayform-owned credentials. It links to the official provider documentation and never asks a Relayform user for a provider secret.
- Production credentials use organisation-owned accounts, MFA and least privilege.

## 2026-08-29 — Supported delivery channels

- WhatsApp is excluded from Relayform. The supported channels are Telegram, VK, MAX and e-mail.
- The exclusion applies to Figma references, product and technical documentation, planning tasks, service-token templates and provider runbooks. It is not replaced with another channel in this change.

## 2026-08-30 — Coverage quality gate

- Every implementation change requires at least 90% statement, branch, function and line coverage from the configured test runner. The gate is enforced by `npm test`; exceptions require explicit user approval in OpenSpec.
