import { query } from '../../config/db.js';
import type { UserRow, PublicUser } from '../rows.js';

/**
 * Find a login user by phone alone. Phone is globally unique across every
 * tenant (see migration 0003) — login no longer needs an institute slug to
 * disambiguate.
 */
export async function findForLogin(phone: string): Promise<UserRow | null> {
  const clean = phone.replace(/\D/g, '');
  const with91 = clean.length === 10 ? `91${clean}` : clean;
  const without91 = (clean.length === 12 && clean.startsWith('91')) ? clean.slice(2) : clean;

  // Fetch regardless of is_active so we can return a proper SUSPENDED error
  const { rows } = await query<UserRow>(
    `SELECT * FROM users WHERE phone = $1 OR phone = $2 OR phone = $3 OR phone = $4 LIMIT 1`,
    [phone, clean, with91, without91]
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
