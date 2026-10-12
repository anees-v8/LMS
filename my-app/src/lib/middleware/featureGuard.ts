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

export interface EffectiveFeatures {
  /** Feature keys actually unlocked right now — during an active trial this
   *  is every FeatureKey regardless of the assigned plan. */
  features: string[];
  planName: string | null;
  /** True while an active (non-expired) trial grants every feature. */
  isTrialUnlocked: boolean;
}

const ALL_FEATURE_KEYS: FeatureKey[] = [
  'student_management',
  'batch_management',
  'digital_attendance',
  'fee_management',
  'video_library',
  'whatsapp_reminders',
  'email_notifications',
  'live_classes',
  'performance_reports',
  'online_tests',
  'doubt_solving',
];

/**
 * Resolves which features a tenant actually has access to right now —
 * the single source of truth `requireFeature` and `/auth/me` both build on,
 * so the trial/plan logic only lives in one place.
 */
export async function getEffectiveFeatures(tenantId: number): Promise<EffectiveFeatures> {
  const { rows } = await query<PlanRow & { status: string; trialEndsAt: Date | null }>(
    `SELECT s.status, s.trial_ends_at AS "trialEndsAt",
            pc.features,
            pc.name AS "planName"
       FROM subscriptions s
       LEFT JOIN plan_catalog pc ON pc.id = s.plan_catalog_id
      WHERE s.tenant_id = $1`,
    [tenantId]
  );

  const sub = rows[0];
  if (!sub) throw ApiError.forbidden('NO_SUBSCRIPTION', 'No subscription found');

  // During an active trial — every feature is unlocked.
  if (sub.status === 'trial' && (!sub.trialEndsAt || new Date() <= new Date(sub.trialEndsAt))) {
    return { features: ALL_FEATURE_KEYS, planName: sub.planName, isTrialUnlocked: true };
  }

  // No plan_catalog assigned yet (legacy tenant) — allow all (backward compat).
  if (!sub.features) {
    return { features: ALL_FEATURE_KEYS, planName: sub.planName, isTrialUnlocked: false };
  }

  return {
    features: Array.isArray(sub.features) ? sub.features : [],
    planName: sub.planName,
    isTrialUnlocked: false,
  };
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
  const effective = await getEffectiveFeatures(tenantId);

  const missingFeature = requiredFeatures.find((f) => !effective.features.includes(f));
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
      `This feature requires the ${requiredPlan} plan or higher. Current plan: ${effective.planName ?? 'Basic'}.`
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
