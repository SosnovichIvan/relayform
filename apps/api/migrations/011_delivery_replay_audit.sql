CREATE TABLE delivery_replay_audit (
  id uuid PRIMARY KEY,
  delivery_attempt_id uuid NOT NULL REFERENCES delivery_attempts(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  previous_failure_code text NOT NULL,
  previous_attempt_count integer NOT NULL CHECK (previous_attempt_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX delivery_replay_audit_attempt_created_at_idx
  ON delivery_replay_audit(delivery_attempt_id, created_at DESC);
