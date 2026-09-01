ALTER TABLE email_templates
  ADD COLUMN theme text NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  ADD COLUMN redirect_url text NOT NULL DEFAULT 'https://relayform.ru';
ALTER TABLE email_templates ALTER COLUMN theme DROP DEFAULT;
ALTER TABLE email_templates ALTER COLUMN redirect_url DROP DEFAULT;
