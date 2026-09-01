## Schema and validation

Migration `006` adds `theme` and `redirect_url`. Legacy rows receive `light` and a temporary Relayform landing URL before defaults are removed. Create/update accepts only `light|dark` and absolute HTTP(S) redirect URLs. A new owned-template read endpoint supports editor hydration.

## Fixed visual contract

The editor changes subject, body, theme and redirect destination. Wordmark, confirmation CTA text, layout and Relayform attribution/link are fixed. Theme switches the preview's semantic surface/text roles rather than introducing arbitrary colors.

## Frontend composition

`widgets/emailTemplates` loads projects and templates and owns list/empty/error states. `EmailTemplateEditor` owns fields, preview and save. On mobile the preview is rendered before a bounded scrollable field region; on desktop the two columns sit side by side.

## Safety

BFF handlers use the existing server-only session boundary and stable errors. Delete requires browser confirmation. No template accepts raw HTML, scriptable URL schemes or provider credentials.
