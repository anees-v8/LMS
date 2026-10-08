import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { query } from '../db';
import ApiError from '../utils/ApiError';
import { renderOtpEmail } from '../utils/emailTemplate';
import { env } from '../config/env';
import { Resend } from 'resend';

export type OtpPurpose = 'password_reset' | 'email_change' | 'password_change';

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
// Per-target throttle — a target (email) can't have more than this many
// OTPs requested within the window, regardless of which account/purpose.
const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_REQUESTS = 3;

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!env.resend.enabled) return null;
  if (!_resend) _resend = new Resend(env.resend.apiKey);
  return _resend;
}

function generateCode(): string {
  // 6-digit numeric, zero-padded — randomInt is crypto-strong, unlike Math.random.
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/**
 * Generates and emails a one-time code for the given purpose, scoped to
 * `userId` (null for forgot-password, where the caller isn't authenticated
 * yet) and sent to `target` (an email address today — the schema/API is
 * purpose+target shaped, not email-specific, so a WhatsApp channel can be
 * added later as a second send path without changing this contract).
 *
 * Sends directly via Resend, bypassing the plan-gated notification
 * pipeline (hasFeature('email_notifications')) — this must work for every
 * tenant regardless of plan tier.
 */
export async function requestOtp({
  userId,
  purpose,
  target,
  purposeLabel,
}: {
  userId: number | null;
  purpose: OtpPurpose;
  target: string;
  purposeLabel: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) throw ApiError.internal('EMAIL_NOT_CONFIGURED', 'Email delivery is not configured on this server.');

  const { rows: recent } = await query<{ count: number }>(
    `SELECT count(*)::int AS count FROM otp_verifications
      WHERE target = $1 AND created_at > now() - ($2 || ' minutes')::interval`,
    [target, RATE_LIMIT_WINDOW_MINUTES]
  );
  if (recent[0].count >= RATE_LIMIT_MAX_REQUESTS) {
    throw ApiError.tooManyRequests('OTP_RATE_LIMITED', 'Too many codes requested. Please wait a few minutes and try again.');
  }

  const code = generateCode();
  const otpHash = await bcrypt.hash(code, 10);

  await query(
    `INSERT INTO otp_verifications (user_id, purpose, target, otp_hash, expires_at)
     VALUES ($1, $2, $3, $4, now() + ($5 || ' minutes')::interval)`,
    [userId, purpose, target, otpHash, OTP_EXPIRY_MINUTES]
  );

  await resend.emails.send({
    from: env.resend.from,
    to: target,
    subject: `${code} is your Campus verification code`,
    text: `${purposeLabel}\n\nYour verification code: ${code}\n\nThis code expires in ${OTP_EXPIRY_MINUTES} minutes and only works once.\n\nDidn't request this? You can safely ignore this email — no changes will be made without this code.\n\n— Campus`,
    html: renderOtpEmail(code, purposeLabel, OTP_EXPIRY_MINUTES),
  });
}

/**
 * Verifies `code` against the most recent unconsumed OTP for this
 * (userId, purpose, target) and marks it consumed on success. Throws on
 * expiry, exhausted attempts, or mismatch — never reveals which, beyond
 * what's in the error code, to avoid helping an attacker narrow things down.
 */
export async function verifyOtp({
  userId,
  purpose,
  target,
  code,
}: {
  userId: number | null;
  purpose: OtpPurpose;
  target: string;
  code: string;
}): Promise<void> {
  const { rows } = await query<{ id: number; otp_hash: string; attempts: number; expires_at: Date }>(
    `SELECT id, otp_hash, attempts, expires_at FROM otp_verifications
      WHERE purpose = $1 AND target = $2 AND consumed_at IS NULL
        AND ($3::int IS NULL OR user_id = $3)
      ORDER BY created_at DESC LIMIT 1`,
    [purpose, target, userId]
  );
  const row = rows[0];
  if (!row) throw ApiError.badRequest('OTP_INVALID', 'Invalid or expired code.');
  if (new Date() > new Date(row.expires_at)) throw ApiError.badRequest('OTP_EXPIRED', 'This code has expired. Request a new one.');
  if (row.attempts >= MAX_ATTEMPTS) throw ApiError.badRequest('OTP_LOCKED', 'Too many incorrect attempts. Request a new code.');

  const ok = await bcrypt.compare(code, row.otp_hash);
  if (!ok) {
    await query(`UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1`, [row.id]);
    throw ApiError.badRequest('OTP_INVALID', 'Invalid or expired code.');
  }

  await query(`UPDATE otp_verifications SET consumed_at = now() WHERE id = $1`, [row.id]);
}
