CREATE TABLE submissions (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, event_id)
);

ALTER TABLE delivery_attempts
  ALTER COLUMN event_id TYPE text USING event_id::text,
  ADD COLUMN project_id uuid,
  ADD COLUMN provider_message_id text,
  ADD COLUMN failure_code text,
  ADD COLUMN is_retryable boolean,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

UPDATE delivery_attempts AS attempts
SET project_id = forms.project_id
FROM destinations
JOIN forms ON forms.id = destinations.form_id
WHERE destinations.id = attempts.destination_id;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM delivery_attempts WHERE project_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot derive project ownership for existing delivery attempts';
  END IF;
END $$;

ALTER TABLE delivery_attempts
  ALTER COLUMN project_id SET NOT NULL,
  ADD CONSTRAINT delivery_attempts_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  ADD CONSTRAINT delivery_attempts_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE,
  ADD CONSTRAINT delivery_attempts_status_check CHECK (status IN ('queued', 'delivered', 'failed'));

ALTER TABLE delivery_attempts DROP CONSTRAINT delivery_attempts_idempotency_key_key;
ALTER TABLE delivery_attempts ADD CONSTRAINT delivery_attempts_project_id_idempotency_key_key UNIQUE (project_id, idempotency_key);

CREATE INDEX delivery_attempts_project_created_at_idx ON delivery_attempts(project_id, created_at DESC);
CREATE INDEX delivery_attempts_destination_created_at_idx ON delivery_attempts(destination_id, created_at DESC);

CREATE TABLE delivery_jobs (
  delivery_attempt_id uuid PRIMARY KEY REFERENCES delivery_attempts(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('telegram', 'vk', 'max', 'email')),
  recipient text NOT NULL,
  message text NOT NULL,
  available_at timestamptz NOT NULL DEFAULT now(),
  claimed_by text,
  lease_expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX delivery_jobs_claim_idx
  ON delivery_jobs(available_at, lease_expires_at)
  WHERE completed_at IS NULL;
