CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id),
  name text NOT NULL,
  api_key_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE forms (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE delivery_attempts (
  id uuid PRIMARY KEY,
  event_id uuid NOT NULL,
  destination_id uuid NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
