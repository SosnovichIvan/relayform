# Frontend API integration

## Goal

Replace demo authentication and cabinet form data with the existing Fastify API while keeping the backend session token outside browser JavaScript.

## Scope

- Login and registration submit through same-origin Next.js route handlers.
- The BFF stores the backend session token in a secure `HttpOnly`, `SameSite=Lax` cookie.
- Logout deletes that cookie.
- Cabinet loads the current user's projects, lets an empty account create its first project, selects among projects and loads that project's forms.
- Cabinet includes explicit loading, empty, error and unauthorized states.
- Project API keys, session tokens and backend diagnostics never enter client responses.

Form/destination mutations, template persistence and server-side session expiry are separate increments.

## FSD boundaries

- `features/authentication` owns the interactive credential and logout actions.
- `entities/project` and `entities/form` own browser-facing types.
- `widgets/cabinet` composes project selection and form overview because Next.js reserves `src/pages` for Pages Router even in App Router projects.
- `shared/api` owns the server-only backend client and BFF authentication handler so server imports never enter the client feature barrel.
- `app/api` route handlers remain thin BFF entrypoints; `app/**/page.tsx` only composes public APIs.

## Security

The frontend reads `RELAYFORM_API_URL` only on the server. Auth cookies use `HttpOnly`, `SameSite=Lax`, path `/`, seven-day max age and `Secure` in production. Authenticated proxy calls add the backend bearer token server-side. Unauthorized responses remove no data client-side and lead the cabinet to `/login`. Project creation responses are reduced to `{id,name}` so backend API keys are not exposed.

## Verification

Focused tests cover validation, backend errors, cookie options, response sanitization, logout, cabinet state transitions and project selection. All configured coverage metrics stay at or above 90%, followed by lint, typecheck and production build.
