CREATE TABLE destinations (
  id uuid PRIMARY KEY,
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('telegram', 'vk', 'max', 'email')),
  recipient text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending_activation', 'active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX destinations_form_id_idx ON destinations(form_id);

CREATE TABLE email_templates (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_templates_project_id_idx ON email_templates(project_id);
