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
      const now = new Date();
      const { rows: subRows } = await query<{ trial_ends_at: Date | null }>(
        `SELECT trial_ends_at FROM subscriptions WHERE tenant_id = $1`,
        [tenantId]
      );
      const trialEndsAt = subRows[0]?.trial_ends_at;
      // If trial is still active, allow everything
      if (!trialEndsAt || now <= new Date(trialEndsAt)) {
        return next();
      }
      // Trial expired — fall through to plan check
    }

    // If no plan_catalog assigned yet (old flat plan), allow all (backward compat)
    if (!sub.features) {
      return next();
    }

    const tenantFeatures: string[] = Array.isArray(sub.features) ? sub.features : [];

    const missingFeature = requiredFeatures.find((f) => !tenantFeatures.includes(f));
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
        `This feature requires the ${requiredPlan} plan or higher. Current plan: ${sub.planName ?? 'Basic'}.`
      );
    }

    next();
  });
}

export default featureGuard;
