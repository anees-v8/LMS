import { query } from '../db';
import ApiError from '../utils/ApiError';

/**
 * Feature keys that map to plan_catalog.features JSONB array.
 * Ported from the Express backend's src/middleware/featureGuard.ts.
 */
export type FeatureKey =
  | 'student_management'
  | 'batch_management'
  | 'digital_attendance'
  | 'fee_management'
  | 'video_library'
  | 'whatsapp_reminders'
  | 'email_notifications'
  | 'live_classes'
  | 'performance_reports'
  | 'online_tests'
  | 'doubt_solving';

interface PlanRow {
  features: string[];
  planName: string | null;
}

/**
 * Checks whether a tenant's current plan includes the required feature(s).
 * Throws ApiError.forbidden('PLAN_UPGRADE_REQUIRED') if not.
 *
 * During the 7-day trial, ALL features are accessible regardless of plan.
 * After the trial, only features in the subscribed plan are accessible.
 *
 * Usage in a route handler:
 *   const user = requireAuth(req, 'coaching_admin');
 *   await requireFeature(requireTenantId(user), 'live_classes');
 */
export async function requireFeature(tenantId: number, ...requiredFeatures: FeatureKey[]): Promise<void> {
  const { rows } = await query<PlanRow & { status: string }>(
    `SELECT s.status,
            pc.features,
            pc.name AS "planName"
       FROM subscriptions s
       LEFT JOIN plan_catalog pc ON pc.id = s.plan_catalog_id
      WHERE s.tenant_id = $1`,
    [tenantId]
  );

  const sub = rows[0];
  if (!sub) throw ApiError.forbidden('NO_SUBSCRIPTION', 'No subscription found');

  // During active trial — all features are unlocked (7-day free trial)
  if (sub.status === 'trial') {
    const { rows: subRows } = await query<{ trial_ends_at: Date | null }>(
      `SELECT trial_ends_at FROM subscriptions WHERE tenant_id = $1`,
      [tenantId]
    );
    const trialEndsAt = subRows[0]?.trial_ends_at;
    if (!trialEndsAt || new Date() <= new Date(trialEndsAt)) {
      return;
    }
    // Trial expired — fall through to plan check
  }

  // If no plan_catalog assigned yet (old flat plan), allow all (backward compat)
  if (!sub.features) return;

  const tenantFeatures: string[] = Array.isArray(sub.features) ? sub.features : [];

  const missingFeature = requiredFeatures.find((f) => !tenantFeatures.includes(f));
  if (missingFeature) {
    const { rows: upgradePlanRows } = await query<{ name: string }>(
      `SELECT name FROM plan_catalog
        WHERE features ? $1
          AND is_active = true
        ORDER BY price_monthly ASC
        LIMIT 1`,
      [missingFeature]
    );
    const requiredPlan = upgradePlanRows[0]?.name ?? 'Pro';

    throw ApiError.forbidden(
      'PLAN_UPGRADE_REQUIRED',
      `This feature requires the ${requiredPlan} plan or higher. Current plan: ${sub.planName ?? 'Basic'}.`
    );
  }
}

/**
 * Same check as requireFeature, but never throws — returns true/false.
 * Used where a feature gates a side-effect (e.g. sending an email) rather
 * than blocking the whole request; a missing feature should just skip the
 * side-effect quietly, not fail the caller's request.
 */
export async function hasFeature(tenantId: number, feature: FeatureKey): Promise<boolean> {
  try {
    await requireFeature(tenantId, feature);
    return true;
  } catch {
    return false;
  }
}
