import cron from 'node-cron';
import { query } from '../config/db.js';
import logger from '../utils/logger.js';
import * as notificationCenter from '../services/notificationCenter.service.js';

/** Remind students this many days before a fee's due date, and again on the due date itself. */
const REMINDER_DAYS_BEFORE = [3, 1, 0];

/**
 * Daily sweep: for every fee_due whose due_date is 3, 1, or 0 days away,
 * notify that student if they haven't fully paid it yet.
 */
export async function runFeeReminderSweep(): Promise<{ remindersSent: number }> {
  const { rows: due } = await query<{
    id: number;
    tenant_id: number;
    student_id: number;
    user_id: number;
    title: string;
    amount: number;
    due_date: string;
    days_left: number;
    paid: number;
  }>(
    `SELECT fd.id, fd.tenant_id, fd.student_id, u.id AS user_id, fd.title, fd.amount, fd.due_date,
            (fd.due_date - CURRENT_DATE) AS days_left,
            COALESCE((SELECT sum(fp.amount_paid) FROM fee_payments fp WHERE fp.fee_due_id = fd.id), 0) AS paid
       FROM fee_dues fd
       JOIN students s ON s.id = fd.student_id
       JOIN users u ON u.id = s.user_id
      WHERE u.is_active = true
        AND (fd.due_date - CURRENT_DATE) = ANY($1::int[])`,
    [REMINDER_DAYS_BEFORE]
  );

  let remindersSent = 0;

  for (const fee of due) {
    if (fee.paid >= fee.amount) continue; // already fully paid

    // Already reminded today for this exact due? Skip
    const already = await query(
      `SELECT 1 FROM notifications
        WHERE type = 'fee_due' AND entity_id = $1 AND created_at::date = CURRENT_DATE
        LIMIT 1`,
      [fee.id]
    );
    if (already.rowCount) continue;

    const title = fee.days_left === 0 ? 'Fee due today' : 'Fee due soon';
    const body =
      fee.days_left === 0
        ? `${fee.title} (₹${fee.amount}) is due today.`
        : `${fee.title} (₹${fee.amount}) is due in ${fee.days_left} day${fee.days_left === 1 ? '' : 's'}.`;

    await notificationCenter.sendNotification({
      userIds: [fee.user_id],
      tenantId: fee.tenant_id,
      title,
      body,
      type: 'fee_due',
      entityId: fee.id,
    });
    remindersSent += 1;
  }

  logger.info('Fee reminder sweep complete', { duesChecked: due.length, remindersSent });
  return { remindersSent };
}

/** Schedule at 09:00 every day — a reasonable local-morning time for a reminder. */
export function scheduleFeeReminderJob(): void {
  cron.schedule('0 9 * * *', () => {
    runFeeReminderSweep().catch((err) =>
      logger.error('Fee reminder sweep failed', { error: err instanceof Error ? err.message : String(err) })
    );
  });
  logger.info('Fee reminder cron scheduled (daily 09:00)');
}
