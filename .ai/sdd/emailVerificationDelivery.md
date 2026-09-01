# E-mail verification delivery

## Goal

Turn persisted confirmation templates into an API-driven, Relayform-sent e-mail verification flow for websites integrating with a project API key.

## Contract

The request supplies an owned `templateId`, recipient e-mail and idempotency header. Relayform normalizes the address, renders fixed escaped HTML/plain text, issues a 15-minute digest-only token and returns no recipient or token. Confirmation is single-use and redirects only to the HTTP(S) URL already validated on the template.

## Boundaries

Provider credentials, sender identity and public Relayform base URL are server runtime configuration. Browser code never receives them. The public result route consumes through a server-only call and exposes only branded success/failure states. Phone confirmation and background e-mail retry remain separate changes.

## Verification

Repository, renderer, provider, API and result states require focused tests. Statement, branch, function and line coverage remain at least 90% in both configured suites.
