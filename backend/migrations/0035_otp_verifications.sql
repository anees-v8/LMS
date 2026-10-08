-- ============================================================
-- OTP-based verification for password reset, and OTP-gated
-- email/password changes from the profile screen. Email becomes
-- a required, verified channel going forward (WhatsApp OTP is
-- planned as a second channel later — this table is channel-
-- agnostic by design, keyed on purpose + target rather than
-- assuming email).
-- ============================================================

CREATE TABLE IF NOT EXISTS otp_verifications (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  purpose     VARCHAR(30) NOT NULL CHECK (purpose IN ('password_reset', 'email_change', 'password_change')),
  target      VARCHAR(120) NOT NULL, -- the email (or future phone) the OTP was sent to
  otp_hash    TEXT NOT NULL,
  attempts    SMALLINT NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_verifications_user_purpose ON otp_verifications(user_id, purpose);
-- Rate-limit lookups ("how many OTPs sent to this target recently").
CREATE INDEX IF NOT EXISTS idx_otp_verifications_target_created ON otp_verifications(target, created_at);

-- Case-insensitive uniqueness: two accounts can't share an email, which
-- would make "forgot password" ambiguous about which account to reset.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users (lower(email)) WHERE email IS NOT NULL;
