import { query } from '../index';
import type { UserRow, PublicUser } from '../rows';

/**
 * Find a login user by phone alone. Phone is globally unique across every
 * tenant (see migration 0003) — login no longer needs an institute slug to
 * disambiguate.
 * Ported verbatim from the Express backend's src/db/repositories/userRepo.ts.
 */
export async function findForLogin(phone: string): Promise<UserRow | null> {
  // Fetch regardless of is_active so we can return a proper SUSPENDED error
  const { rows } = await query<UserRow>(
    `SELECT * FROM users WHERE phone = $1`,
    [phone]
  );
  return rows[0] || null;
}

export async function findById(id: number): Promise<UserRow | null> {
  const { rows } = await query<UserRow>(`SELECT * FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

/** Public-safe projection of a user row. */
export function toPublicUser(u: UserRow | null | undefined): PublicUser | null {
  if (!u) return null;
  return {
    id: u.id,
    role: u.role,
    tenantId: u.tenant_id,
    fullName: u.full_name,
    phone: u.phone,
    email: u.email,
    avatarUrl: u.avatar_url,
    termsVersion: u.terms_version,
    termsAcceptedAt: u.terms_accepted_at ? u.terms_accepted_at.toISOString() : null,
  };
}

/** Persists a new avatar URL (already uploaded to Cloudinary by the
 *  client) for the given user, regardless of role. */
export async function updateAvatarUrl(userId: number, avatarUrl: string): Promise<PublicUser | null> {
  const { rows } = await query<UserRow>(
    `UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING *`,
    [avatarUrl, userId]
  );
  return toPublicUser(rows[0]);
}

/** Stamps the given user as having accepted the current terms version.
 *  The version is always server-authoritative (see auth.service.ts's
 *  CURRENT_TERMS_VERSION) — never accepted from client input, so a stale
 *  client can't mark an old version as "current". */
export async function acceptTerms(userId: number, version: string): Promise<PublicUser | null> {
  const { rows } = await query<UserRow>(
    `UPDATE users SET terms_version = $1, terms_accepted_at = now() WHERE id = $2 RETURNING *`,
    [version, userId]
  );
  return toPublicUser(rows[0]);
}
