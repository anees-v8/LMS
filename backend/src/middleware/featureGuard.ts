import type { Request, Response, NextFunction } from 'express';
import { query } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Feature keys that map to plan_catalog.features JSONB array.
 * These are the string identifiers for each gated feature.
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
  | 'doubt_solving'
  | 'teacher_accounts'
  | 'online_payments'
  | 'website_request';

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
  'teacher_accounts',
  'online_payments',
  'website_request',
];

/**
 * Resolves which features a tenant actually has access to right now —
 * single source of truth used for feature gating across the backend.
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

  // During active trial — all features are unlocked (7-day free trial)
  if (sub.status === 'trial' && (!sub.trialEndsAt || new Date() <= new Date(sub.trialEndsAt))) {
    return { features: ALL_FEATURE_KEYS, planName: sub.planName, isTrialUnlocked: true };
  }

  // If no plan_catalog assigned yet (old flat plan), allow all (backward compat)
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
 * Middleware factory that checks if the tenant's current plan includes
 * the required feature. If not, returns 403 with PLAN_UPGRADE_REQUIRED.
 *
 * During the 7-day trial, ALL features are accessible regardless of plan.
 * After the trial, only features in the subscribed plan are accessible.
 *
 * Usage:
 *   router.post('/live-classes', featureGuard('live_classes'), ctrl.createLiveClass);
 */
export function featureGuard(...requiredFeatures: FeatureKey[]) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw ApiError.forbidden('NO_TENANT');

    const effective = await getEffectiveFeatures(tenantId);

    const missingFeature = requiredFeatures.find((f) => !effective.features.includes(f));
    if (missingFeature) {
      // Determine which plan first unlocks this feature
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

    next();
  });
}

export default featureGuard;
