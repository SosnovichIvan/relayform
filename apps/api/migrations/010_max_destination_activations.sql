CREATE TABLE max_destination_activations (
  destination_id uuid PRIMARY KEY REFERENCES destinations(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_digest text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX max_destination_activations_expires_at_idx ON max_destination_activations(expires_at);
