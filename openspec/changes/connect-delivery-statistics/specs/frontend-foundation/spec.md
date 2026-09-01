## ADDED Requirements

### Requirement: Real delivery statistics in Cabinet

The Cabinet MUST render persisted 30-day delivery statistics for the selected project in both semantic themes and responsive layouts.

#### Scenario: Project has delivery attempts
- **WHEN** forms and statistics load successfully
- **THEN** four summary widgets show total, delivered, failed and queued counts
- **AND THEN** each form shows its own counts and provider breakdown.

#### Scenario: Project or form has no attempts
- **WHEN** no matching attempts exist in the 30-day period
- **THEN** the interface shows zero values without inventing activity.

#### Scenario: Statistics cannot load
- **WHEN** the paired forms/statistics request fails
- **THEN** the Cabinet shows a retry action, while an unauthorized response returns the user to login.
