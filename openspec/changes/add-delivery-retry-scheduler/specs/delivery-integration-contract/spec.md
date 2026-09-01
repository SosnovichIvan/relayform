## ADDED Requirements

### Requirement: Bounded automatic retry

The delivery worker MUST reschedule only retryable transport failures with bounded exponential backoff and jitter while attempts remain.

#### Scenario: Temporary failure with attempts remaining

- **WHEN** a transport returns a retryable failure before the maximum attempt count
- **THEN** the job remains incomplete and becomes available after the calculated delay

#### Scenario: Permanent failure

- **WHEN** a transport returns a non-retryable failure
- **THEN** the attempt is immediately finalized as failed

#### Scenario: Retry budget exhausted

- **WHEN** a retryable failure occurs on the final allowed attempt
- **THEN** the attempt and job are finalized as failed

#### Scenario: Provider requests a retry delay

- **WHEN** a retryable provider response includes a valid `Retry-After` hint within the configured maximum delay
- **THEN** the bounded scheduled delay is no shorter than that hint

### Requirement: Sanitized retry state

Retry scheduling MUST persist and expose only stable failure metadata, never raw provider responses, recipients or message content.

#### Scenario: Retry is waiting

- **WHEN** the owning project reads a rescheduled attempt
- **THEN** it receives the queued status and safe failure code/retryable flag
