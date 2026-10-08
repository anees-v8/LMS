import { query } from '../db';
import ApiError from '../utils/ApiError';

interface SubscriptionRow {
  status: string;
  trial_ends_at: Date | null;
}

/**
 * Blocks coaching-admin WRITE actions when the tenant's trial has expired or
 * the account is past_due / suspended. Read (GET) routes stay open (soft
 * lock) so the institute can still view its data and reach the "Pay Now"
 * screen. Ported from the Express backend's src/middleware/subscriptionGuard.ts.
 *
 * Call explicitly at the top of a POST/PUT/PATCH/DELETE route handler, right
 * after requireAuth/requireTenantId — Next.js route handlers have no
 * middleware chain to attach to.
 *
 *   const user = requireAuth(req, 'coaching_admin');
 *   const tenantId = requireTenantId(user);
 *   await requireActiveSubscription(tenantId);
 */
export async function requireActiveSubscription(tenantId: number): Promise<void> {
  const { rows } = await query<SubscriptionRow>(
    `SELECT status, trial_ends_at FROM subscriptions WHERE tenant_id = $1`,
    [tenantId]
  );
  const sub = rows[0];
  if (!sub) throw ApiError.forbidden('NO_SUBSCRIPTION', 'No subscription found');

  const now = new Date();

  if (sub.status === 'trial') {
    if (sub.trial_ends_at && now > new Date(sub.trial_ends_at)) {
      throw ApiError.forbidden('TRIAL_EXPIRED', 'Your free trial has ended. Please subscribe to continue.');
    }
    return;
  }

  if (sub.status === 'active') return;

  if (sub.status === 'past_due' || sub.status === 'suspended') {
    throw ApiError.forbidden('PAYMENT_REQUIRED', 'Payment required to continue using the admin panel.');
  }
}
