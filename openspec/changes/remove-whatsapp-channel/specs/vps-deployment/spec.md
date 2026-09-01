## MODIFIED Requirements

### Requirement: Provider credential acquisition guide

The repository MUST document where an administrator obtains and rotates credentials for Telegram, VK, MAX and the selected transactional e-mail provider. The guide MUST NOT instruct an administrator to create or store a WhatsApp credential.

#### Scenario: Preparing MVP service credentials

- **WHEN** an administrator copies the MVP service-token template
- **THEN** it contains only credentials for supported channels
- **AND THEN** no WhatsApp access token variable is present.
