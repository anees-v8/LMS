import { query } from '../db';
import { getEffectiveFeatures } from '../middleware/featureGuard';
import logger from '../utils/logger';

/**
 * Checks whether a tenant is entitled to automated Meta WhatsApp Cloud API messaging.
 * Automated WhatsApp is ONLY enabled for plans with 'whatsapp_reminders' (Pro, Elite, or active trial).
 * Basic plans return false (they use free manual wa.me links).
 */
export async function canTenantUseWhatsappApi(tenantId: number): Promise<boolean> {
  try {
    const effective = await getEffectiveFeatures(tenantId);
    return effective.features.includes('whatsapp_reminders');
  } catch (err) {
    logger.error('Error checking tenant whatsapp feature entitlement', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    // Financially safe fallback: if check fails, do NOT spend money on paid API
    return false;
  }
}

/**
 * Attempts to claim a daily WhatsApp dispatch slot for a student on a specific date.
 * Returns true if this is the FIRST dispatch today (slot claimed successfully).
 * Returns false if an alert of this type was ALREADY dispatched today (duplicate prevented).
 *
 * Concurrency-safe: utilizes database UNIQUE constraint (ON CONFLICT DO NOTHING).
 */
export async function claimDailyWhatsappDispatch(
  tenantId: number,
  studentId: number,
  dispatchType: 'absent' | 'fee_reminder',
  date: string
): Promise<boolean> {
  try {
    const res = await query(
      `INSERT INTO whatsapp_daily_dispatches (tenant_id, student_id, dispatch_type, date)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id, student_id, dispatch_type, date) DO NOTHING
       RETURNING id`,
      [tenantId, studentId, dispatchType, date]
    );

    const claimed = (res.rowCount ?? 0) > 0;
    if (!claimed) {
      logger.info('Duplicate daily WhatsApp dispatch skipped to prevent costs', {
        tenantId,
        studentId,
        dispatchType,
        date,
      });
    }
    return claimed;
  } catch (err) {
    logger.error('Error claiming daily whatsapp dispatch slot', {
      tenantId,
      studentId,
      dispatchType,
      date,
      error: err instanceof Error ? err.message : String(err),
    });
    // Financially safe fallback: do NOT dispatch if claiming fails
    return false;
  }
}
