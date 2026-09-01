# Form and destination CRUD

## Goal

Connect the cabinet form editor to persisted forms and recipient-only destinations without exposing provider credentials.

## Contract

A form stores `name` and `siteUrl`. The editor creates or updates it within an owned project and can delete it from the cabinet. A dedicated owned-form read endpoint supplies edit data.

Destinations support Telegram, VK, MAX and e-mail. The editor may configure several providers at once. Existing records are updated, newly selected records are created and cleared records are deleted. Provider credentials never enter browser requests.

Telegram, VK and MAX are created with an internal pending recipient and activated through their provider-specific one-time bot/community flows; the user never types `chat_id`, sender ID or MAX `user_id`. E-mail accepts an address and remains visibly pending until ownership confirmation.

## UI states

The editor has loading, validation, saving, success, error and unauthorized states. Destructive form deletion requires an explicit confirmation interaction. Mobile wrapping and both semantic themes are retained.

## Boundaries

Thin App Router handlers proxy authenticated calls. `features/manageForm` owns editor orchestration, `features/connectDestination` owns provider fields, and entity types remain independent. No provider token or raw backend diagnostic is returned.
