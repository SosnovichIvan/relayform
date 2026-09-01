## ADDED Requirements

### Requirement: Confirmation-email preview
The Cabinet email editor MUST include a visible preview of the confirmation e-mail in both supported themes.

#### Scenario: Author edits an email template
- **WHEN** an author opens the confirmation-email editor
- **THEN** the editor displays a branded preview with the editable message copy and a single confirmation CTA

### Requirement: Relayform attribution
The preview MUST include an unobtrusive Relayform attribution and a link to the Relayform landing page.

#### Scenario: Recipient views a confirmation email
- **WHEN** the rendered e-mail is shown
- **THEN** the footer communicates that Relayform created the message and provides a Relayform landing-page link

### Requirement: Theme-consistent preview
The preview MUST preserve its hierarchy and brand structure in Light and Dark themes; only theme appearance and editable copy change.

#### Scenario: Author selects Dark theme
- **WHEN** the template theme is Dark
- **THEN** the preview uses dark semantic surfaces and readable text while preserving the same CTA and footer structure

### Requirement: Mobile preview priority
On a mobile email editor, the preview MUST be placed above the editable fields. The fields and save action MUST remain below it as the scrollable editing region.

#### Scenario: Author opens the mobile email editor
- **WHEN** the mobile editor is displayed
- **THEN** the author sees the email preview before scrolling through the fields and save action
