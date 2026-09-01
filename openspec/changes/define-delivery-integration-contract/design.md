## Context

Relayform accepts website-form submissions and delivers the meaningful content to one or more user-configured channels. Provider APIs use different authorization models, but the product should keep a single internal event and destination model.

## Decisions

- Treat each configured destination as a separate delivery attempt; one form event may fan out to multiple destinations.
- Relayform owns the provider credentials and stores them as server-side secrets. A tenant configuration stores only a recipient identifier and delivery preferences; it cannot override provider credentials.
- The Cabinet renders provider-specific recipient fields after a channel is selected and guides the recipient through any required opt-in or bot-start step.
- E-mail uses a Relayform-owned SMTP or transactional-provider adapter; tenants provide only destination addresses and message preferences.

## Non-Goals

- Selecting an e-mail delivery vendor, database, queue or secret manager.
- Implementing provider adapters, webhooks, consent collection or verification delivery.

## Risks / Trade-offs

- Provider access and permissions can change → backend must keep provider configuration versioned and revalidate credentials.
- MAX availability may depend on business verification or partner access → mark its fields as conditional rather than promise a self-serve token flow.
- Free-form user data can include sensitive information → minimize logs, restrict retention and redact secret material.
