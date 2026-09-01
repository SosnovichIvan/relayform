## ADDED Requirements

### Requirement: E-mail destination activation experience

The frontend MUST request ownership activation for a newly saved pending e-mail destination and MUST present public activation results without exposing the token in client state or rendered content.

#### Scenario: Owner saves an e-mail destination
- **WHEN** form/destination persistence succeeds and e-mail remains pending
- **THEN** the frontend requests an activation message and tells the owner to check that address.

#### Scenario: Recipient opens the activation link
- **WHEN** server-side confirmation succeeds
- **THEN** the frontend renders a branded connected state
- **AND WHEN** it fails
- **THEN** it renders the matching invalid, expired, used or unavailable state.
