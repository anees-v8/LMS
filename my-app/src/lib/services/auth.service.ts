import bcrypt from 'bcryptjs';
import * as userRepo from '../db/repositories/userRepo';
import * as tenantRepo from '../db/repositories/tenantRepo';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import ApiError from '../utils/ApiError';
import type { PublicUser } from '../db/rows';

export interface TenantInfo {
  name: string;
  slug: string;
}

/** Bump this whenever the Privacy Policy/Terms content actually changes —
 *  must be kept in lockstep with mobile's Constants.currentTermsVersion.
 *  Any user whose stored terms_version doesn't match gets prompted to
 *  re-accept once, on their next login or session restore. */
export const CURRENT_TERMS_VERSION = '2026-09-15';

export interface LoginInput {
  phone: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: PublicUser | null;
  tenant: TenantInfo | null;
}

/**
 * Authenticate by phone + password alone. Phone is globally unique across
 * every tenant (see migration 0003), so no institute slug is needed to
 * disambiguate — one login form for every role.
 * Ported verbatim from the Express backend's src/services/auth.service.ts.
 */
export async function login({ phone, password }: LoginInput): Promise<LoginResult> {
  const user = await userRepo.findForLogin(phone);
  if (!user) throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid phone or password');

  // Explicitly check suspension before password — gives a clear error
  if (!user.is_active) throw ApiError.forbidden('USER_SUSPENDED', 'Your ID has been suspended. Please contact your institute.');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid phone or password');

  let tenantInfo: TenantInfo | null = null;
  if (user.tenant_id) {
    const tenant = await tenantRepo.findById(user.tenant_id);
    if (!tenant) throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid login');
    if (!tenant.is_active) throw ApiError.forbidden('TENANT_SUSPENDED', 'This institute is suspended');
    tenantInfo = { name: tenant.name, slug: tenant.slug };
  }

  const accessToken = signAccessToken({
    userId: user.id,
    tenantId: user.tenant_id,
    role: user.role,
  });
  const refreshToken = signRefreshToken({ userId: user.id });

  return {
    accessToken,
    refreshToken,
    user: userRepo.toPublicUser(user),
    tenant: tenantInfo,
  };
}

/** Issue a new access token from a valid refresh token. */
export async function refresh({ refreshToken }: { refreshToken: string }): Promise<{ accessToken: string }> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('INVALID_REFRESH', 'Invalid or expired refresh token');
  }
  const user = await userRepo.findById(payload.sub);
  if (!user || !user.is_active) throw ApiError.unauthorized('INVALID_REFRESH', 'User no longer active');

  const accessToken = signAccessToken({
    userId: user.id,
    tenantId: user.tenant_id,
    role: user.role,
  });
  return { accessToken };
}

/** Return current user + institute info for /auth/me. */
export async function me({ userId }: { userId: number }): Promise<{ user: PublicUser | null; tenant: TenantInfo | null }> {
  const user = await userRepo.findById(userId);
  if (!user) throw ApiError.unauthorized('USER_NOT_FOUND');
  const tenant = user.tenant_id ? await tenantRepo.findById(user.tenant_id) : null;
  return { user: userRepo.toPublicUser(user), tenant: tenant ? { name: tenant.name, slug: tenant.slug } : null };
}

/** Sets the caller's own profile photo — any role, no ownership check
 *  needed beyond "it's their own userId" (sourced from the JWT). */
export async function updateAvatar({ userId, avatarUrl }: { userId: number; avatarUrl: string }): Promise<PublicUser> {
  const user = await userRepo.updateAvatarUrl(userId, avatarUrl);
  if (!user) throw ApiError.notFound('USER_NOT_FOUND');
  return user;
}

/** Stamps the current terms/privacy policy version as accepted for the
 *  caller. Always stamps CURRENT_TERMS_VERSION — never a client-supplied
 *  value — so a stale app build can't mark an outdated version current. */
export async function acceptTerms({ userId }: { userId: number }): Promise<PublicUser> {
  const user = await userRepo.acceptTerms(userId, CURRENT_TERMS_VERSION);
  if (!user) throw ApiError.notFound('USER_NOT_FOUND');
  return user;
}

/**
 * Unauthenticated pre-login check: does this phone number's account (if any)
 * still need to accept the current terms? Lets the login form show/hide the
 * acceptance checkbox as soon as the phone is typed, before the user has
 * entered a password. Always returns `true` for an unknown phone (a new
 * account, or a typo) — the checkbox should show rather than silently hide
 * on a lookup miss, so a first-time user is never blocked from accepting.
 * Doesn't check is_active/suspension — this is purely about the terms flag,
 * a suspended user still gets a normal INVALID_CREDENTIALS-shaped rejection
 * at actual login time.
 */
export async function checkTermsStatus({ phone }: { phone: string }): Promise<{ needsAcceptance: boolean }> {
  const user = await userRepo.findForLogin(phone);
  if (!user) return { needsAcceptance: true };
  return { needsAcceptance: user.terms_version !== CURRENT_TERMS_VERSION };
}
