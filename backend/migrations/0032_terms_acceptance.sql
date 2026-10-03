-- ============================================================
-- Previously, "accepting" Privacy Policy/Terms was a checkbox with zero
-- persistence — local widget state on the login screen, reset to
-- unchecked every time it was shown, so every session invalidation
-- (token expiry, logout, reinstall) forced a pointless re-accept even
-- though nothing about the policy had changed. Recording acceptance here
-- lets the app prompt a user only once per policy version, not once per
-- login. Both columns are nullable: existing users simply read as
-- "never accepted yet" and get prompted once after this ships, which is
-- correct — they never durably accepted anything before this existed.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
