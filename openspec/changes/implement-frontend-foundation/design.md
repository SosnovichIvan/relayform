## Context

The approved Figma file defines Landing, Login/Registration and Cabinet references in Light/Dark desktop/mobile. The product supports Telegram, VK, MAX and e-mail only. Backend APIs are planned but not yet implemented.

## Architecture

- `src/app` stays thin and composes FSD pages.
- `src/pages` owns route-level UI; `widgets` own major Cabinet/Landing blocks; `features` own interactive form/theme controls; `entities` expose typed demo data; `shared` owns semantic UI primitives and utilities.
- Demo data is local and clearly not a delivery implementation. Interactive mutations live only in the browser.
- Theme is a semantic `data-theme` attribute stored locally; CSS uses role tokens, not literal values in JSX/Tailwind classes.

## UI behaviour

- Landing CTA routes to registration; header includes theme control and sign-in.
- Login/registration validate fields client-side and route to Cabinet only as a demonstration.
- Cabinet renders forms, statistics and email templates. A selected destination becomes a configuration field with a clear control; available options are Telegram, VK, MAX and e-mail.
- Email-template editor changes only preview theme and copy. On mobile the preview remains above the independently scrolling editor region.

## Deployment

- `/api/health` returns HTTP 200 with no secrets.
- Docker uses a non-root Node runtime. Compose maps the application to loopback and does not load `APP_TOKENS_FILE` into the frontend service.

## Validation

- Run lint, TypeScript checking, focused tests with statement, branch, function and line coverage at least 90%, and production build.
- Inspect responsive Light/Dark routes in a browser and compare primary layouts with Figma references.
