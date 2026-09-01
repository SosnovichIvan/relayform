CREATE TABLE email_verifications (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  token_digest text NOT NULL UNIQUE,
  idempotency_key text NOT NULL,
  redirect_url text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'confirmed')),
  expires_at timestamptz NOT NULL,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, idempotency_key)
);

CREATE INDEX email_verifications_project_id_idx ON email_verifications(project_id);
CREATE INDEX email_verifications_expires_at_idx ON email_verifications(expires_at);
