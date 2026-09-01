## Why

Relayform has approved design and implementation tasks but no runnable application. A frontend foundation is needed to validate the product flow, design system and VPS application contract before backend integrations are built.

## What Changes

- Create a Next.js App Router + TypeScript + Tailwind CSS v4 application with FSD directory boundaries.
- Implement the Landing, Login, Registration and Cabinet UI from the approved Figma references with Light/Dark theme and responsive layouts.
- Provide client-side demo interactions for theme switching, authentication form validation, Cabinet navigation, form destination selection and e-mail template preview.
- Add a non-secret `/api/health`, Dockerfile and production Compose contract compatible with the VPS bootstrap.

## Non-goals

- No production authentication, database, provider delivery, event ingestion or credentials.
- No user-supplied provider tokens and no simulated WhatsApp channel.

## Impact

- Adds the application scaffold, FSD slices, frontend tests and container files.
- Updates deployment documentation/context with the now-implemented application prerequisites.
