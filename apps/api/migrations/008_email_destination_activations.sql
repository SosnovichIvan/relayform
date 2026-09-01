CREATE TABLE email_destination_activations (
  destination_id uuid PRIMARY KEY REFERENCES destinations(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_digest text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed')),
  expires_at timestamptz NOT NULL,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_destination_activations_expires_at_idx ON email_destination_activations(expires_at);
