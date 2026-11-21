ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_subject TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_google_subject ON users(google_subject) WHERE google_subject IS NOT NULL;

CREATE TABLE IF NOT EXISTS email_codes (
 email TEXT NOT NULL,
 purpose TEXT NOT NULL CHECK (purpose IN ('signup','login','reset')),
 digest TEXT NOT NULL,
 sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 expires_at TIMESTAMPTZ NOT NULL,
 attempts INT NOT NULL DEFAULT 0,
 PRIMARY KEY (email, purpose)
);

CREATE INDEX IF NOT EXISTS email_codes_sent_at ON email_codes(sent_at);
CREATE INDEX IF NOT EXISTS email_codes_expires_at ON email_codes(expires_at);
