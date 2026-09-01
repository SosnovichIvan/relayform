ALTER TABLE delivery_jobs
  ADD COLUMN attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN max_attempts integer NOT NULL DEFAULT 5,
  ADD CONSTRAINT delivery_jobs_attempt_count_check CHECK (attempt_count >= 0),
  ADD CONSTRAINT delivery_jobs_max_attempts_check CHECK (max_attempts >= 1);
