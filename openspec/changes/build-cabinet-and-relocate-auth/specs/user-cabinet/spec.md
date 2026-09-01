## Purpose

Defines the initial visual contract of the Relayform user cabinet.

## ADDED Requirements

### Requirement: Connected forms overview
The cabinet SHALL show connected forms with a status, delivery destinations, 30-day message count or rate, and visible edit/delete affordances.

#### Scenario: Managing forms
- **WHEN** a user opens `Формы`
- **THEN** they can identify each connected form, its configured channels and actions to edit or delete it

### Requirement: Form destination setup
The form create/edit view MUST present destination selection for received form data, including Telegram, VK, MAX and E-mail.

#### Scenario: Creating a form
- **WHEN** a user opens `Создать форму`
- **THEN** they can name the form and select one or more message destinations

#### Scenario: Configuring and removing a selected destination
- **WHEN** a user selects a destination badge
- **THEN** the badge becomes a channel configuration input with a visible `×` clear control
- **AND WHEN** the user activates the clear control
- **THEN** the input returns to an unselected destination badge
- **AND** the selected input uses a semantic surface and border that remains readable in Light and Dark

### Requirement: Confirmation-email templates
The cabinet SHALL list existing confirmation-email templates and offer create/edit affordances.

#### Scenario: Managing templates
- **WHEN** a user opens `Письма подтверждения`
- **THEN** they see existing template names, linked forms/statuses and actions to create or edit

### Requirement: Confirmation-email editor
The template create/edit view MUST present a confirmation email subject/body, confirmation button label and redirect URL after confirmation.

#### Scenario: Creating a template
- **WHEN** a user opens `Создать письмо`
- **THEN** they can define email content and the URL to open after the recipient confirms

### Requirement: Cabinet themes and responsive references
The cabinet MUST provide equivalent Light and Dark desktop and 390 px mobile references using the established semantic color roles and Inter typography.

#### Scenario: Comparing themes
- **WHEN** the designer opens either cabinet theme at desktop or mobile width
- **THEN** navigation, form cards, statistics and editor fields remain readable and preserve colour roles without horizontal overflow

#### Scenario: Mobile cabinet flow
- **WHEN** a user opens a cabinet scenario on a 390 px viewport
- **THEN** they can switch between forms and confirmation emails, review content and reach the scenario's primary action without relying on a persistent sidebar or hover

#### Scenario: Compact mobile form actions and destinations
- **WHEN** a user views connected forms or destination options on a 390 px viewport
- **THEN** edit/delete actions remain compact and destination controls do not overlap
