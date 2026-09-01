## Form persistence

Migration `005` adds non-null `site_url` with an empty legacy default, then removes the default. New and updated forms require a valid absolute HTTP(S) URL. Identity repositories expose an owner-scoped `getForm`; unauthorized and unknown forms share `404` at the HTTP boundary.

## Destination reconciliation

The UI holds one configuration per provider. On save, it persists the form first and reconciles destinations by ID: create selected new records, patch changed recipients and delete cleared records. Operations are sequential for the MVP so a failure can be reported precisely; transactional batch reconciliation is a later backend optimization.

Telegram never exposes a recipient field. A new Telegram record uses a server-recognized pending placeholder, then the BFF requests the existing activation URL. The UI opens that link explicitly and shows pending status. Other providers use generic recipient labels until their exact confirmation contracts are implemented.

## Safe BFF

All handlers reuse the `HttpOnly` session cookie and stable error mapping. They proxy only allow-listed fields and never return session/provider secrets. URL path identifiers are encoded.

## Verification

Repository/API tests cover ownership, URL validation and CRUD. BFF tests cover methods and sanitization. UI tests cover multiple selections, create/edit/delete, Telegram activation and failure states; all coverage metrics remain at least 90%.
