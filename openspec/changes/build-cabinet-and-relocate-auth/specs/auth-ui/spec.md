## Purpose

Places entry authentication screens in the correct information architecture before cabinet design is implemented.

## ADDED Requirements

### Requirement: Auth belongs to Landing
Login and Registration Light/Dark desktop/mobile frames SHALL be available on `01 • Landing` and MUST NOT require a Dashboard page.

#### Scenario: Reviewing entry screens
- **WHEN** a designer opens the Landing page
- **THEN** Login and Registration references for Light/Dark desktop/mobile are available with the landing artifacts

### Requirement: Former Dashboard page is removed
The former `02 • Dashboard` page MUST be removed after its auth content is recreated on Landing.

#### Scenario: Reviewing Figma pages
- **WHEN** a designer inspects the document page list
- **THEN** there is no `02 • Dashboard` page containing the entry auth screens
