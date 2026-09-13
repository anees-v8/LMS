import { after } from 'next/server';
import { Resend } from 'resend';
import { query } from '../db';
import ApiError from '../utils/ApiError';
import { writeAudit } from '../utils/audit';
import { getFirebaseMessaging } from '../config/firebase';
import { hasFeature } from '../middleware/featureGuard';
import { renderNotificationEmail } from '../utils/emailTemplate';
import env from '../config/env';
import logger from '../utils/logger';

/**
 * In-app notification broadcasting + inbox reads against the `notifications`
 * table, plus push delivery via Firebase Cloud Messaging. Distinct from
 * `notification.service.ts`, which delivers lead emails / Telegram pushes —
 * unrelated concern, same-ish name on purpose avoided.
 */

export type NotificationTargetRole = 'coaching_admin' | 'teacher' | 'student';

/** Machine-readable notification kind, used by the mobile app to deep-link a
 *  tapped notification to the right screen via `entityId`. */
export type NotificationType =
  | 'broadcast'
  | 'test_scheduled'
  | 'test_reminder'
  | 'test_result'
  | 'attendance_open'
  | 'attendance_expiring'
  | 'attendance_marked'
  | 'content_uploaded'
  | 'fee_due'
  | 'fee_paid'
  | 'live_class_reminder'
  // Kept for old stored notification rows; new code emits 'schedule_update' instead.
  | 'timetable_update'
  | 'schedule_update'
  | 'system';

export interface BroadcastInput {
  title: string;
  body?: string;
  targetRole: NotificationTargetRole;
  /** null = every tenant (super_admin targeting coaching_admins). A number scopes
   *  to one tenant — always required (and enforced from the JWT, never the
   *  request body) when targetRole is 'teacher' or 'student'. */
  tenantId: number | null;
  /** Optional area filter — only meaningful when targetRole is 'coaching_admin'. */
  city?: string;
  /** Optional batch filter — only meaningful when targetRole is 'teacher' or 'student'. */
  batchId?: number;
}

export interface NotificationRow {
  id: number;
  title: string;
  body: string | null;
  type: string | null;
  entityId: number | null;
  isRead: boolean;
  createdAt: Date;
}

/**
 * Sends a notification (in-app row + best-effort push) to an explicit list of
 * users. This is the single entry point every feature-level trigger should
 * call — it never throws on push failure, since the in-app row is the
 * source of truth and push is a best-effort convenience.
 */
export async function sendNotification(input: {
  userIds: number[];
  tenantId: number | null;
  title: string;
  body?: string;
  type?: NotificationType;
  entityId?: number;
}): Promise<{ recipientCount: number }> {
  const { userIds, tenantId, title, body, type, entityId } = input;
  if (userIds.length === 0) return { recipientCount: 0 };

  const { rows } = await query<{ id: number; user_id: number }>(
    `INSERT INTO notifications (tenant_id, user_id, title, body, type, entity_id)
     SELECT $1, uid, $2, $3, $4, $5
       FROM unnest($6::int[]) AS uid
     RETURNING id, user_id`,
    [tenantId, title, body ?? null, type ?? null, entityId ?? null, userIds]
  );

  // Deferred via `after()` so the response isn't blocked, but Vercel keeps
  // the serverless instance alive until this settles (unlike a bare
  // fire-and-forget promise, which can be killed mid-flight once the
  // response is sent).
  after(() =>
    pushToUsers(userIds, title, body, type, entityId).catch((err) =>
      logger.error('Push delivery failed', { error: err instanceof Error ? err.message : String(err) })
    )
  );

  // Email is a paid-tier feature (Pro/Elite) — check once per tenant before
  // bothering to look up any user's email address. Skipped entirely for
  // super_admin broadcasts (tenantId null) and for tenants without the
  // feature; a missing email on a given user is skipped silently too.
  if (tenantId !== null) {
    after(() =>
      emailToUsers(tenantId, userIds, title, body).catch((err) =>
        logger.error('Email delivery failed', { error: err instanceof Error ? err.message : String(err) })
      )
    );
  }

  return { recipientCount: rows.length };
}

/** Best-effort FCM push to every registered device of the given users. Prunes
 *  device_token rows FCM reports as no-longer-registered (uninstalled app /
 *  stale token) so the table doesn't accumulate dead tokens forever. */
async function pushToUsers(
  userIds: number[],
  title: string,
  body: string | undefined,
  type: string | undefined,
  entityId: number | undefined
): Promise<void> {
  const messaging = getFirebaseMessaging();
  if (!messaging) return;

  const { rows: devices } = await query<{ id: number; token: string }>(
    `SELECT id, token FROM device_tokens WHERE user_id = ANY($1::int[])`,
    [userIds]
  );
  if (devices.length === 0) return;

  const result = await messaging.sendEachForMulticast({
    tokens: devices.map((d) => d.token),
    notification: { title, body: body ?? '' },
    data: {
      ...(type ? { type } : {}),
      ...(entityId != null ? { entityId: String(entityId) } : {}),
    },
  });

  const deadTokenIds = result.responses
    .map((r, i) => (!r.success && isUnregisteredError(r.error?.code) ? devices[i].id : null))
    .filter((id): id is number => id !== null);

  if (deadTokenIds.length > 0) {
    await query(`DELETE FROM device_tokens WHERE id = ANY($1::int[])`, [deadTokenIds]);
  }
}

function isUnregisteredError(code?: string): boolean {
  return code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token';
}

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!env.resend.enabled) return null;
  if (!_resend) _resend = new Resend(env.resend.apiKey);
  return _resend;
}

/** Best-effort email to every given user who (a) belongs to a tenant on a
 *  plan with the 'email_notifications' feature and (b) has an email address
 *  on file — most students/parents log in by phone only and have none, so
 *  this silently reaches only the subset who do. */
async function emailToUsers(
  tenantId: number,
  userIds: number[],
  title: string,
  body: string | undefined
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const allowed = await hasFeature(tenantId, 'email_notifications');
  if (!allowed) return;

  const { rows: recipients } = await query<{ email: string }>(
    `SELECT email FROM users WHERE id = ANY($1::int[]) AND email IS NOT NULL AND email <> ''`,
    [userIds]
  );
  if (recipients.length === 0) return;

  const html = renderNotificationEmail(title, body);
  await Promise.allSettled(
    recipients.map((r) =>
      resend.emails.send({
        from: env.resend.from,
        to: r.email,
        subject: title,
        text: body ?? title,
        html,
      })
    )
  );
}

/** Resolves the user_ids of every active student enrolled in a batch — the
 *  audience for per-batch triggers (attendance opened, new content, etc.). */
export async function batchStudentUserIds(tenantId: number, batchId: number): Promise<number[]> {
  const { rows } = await query<{ id: number }>(
    `SELECT u.id
       FROM users u
       JOIN students s ON s.user_id = u.id
       JOIN batch_enrollments be ON be.student_id = s.id
      WHERE be.batch_id = $1 AND u.tenant_id = $2 AND u.is_active = true`,
    [batchId, tenantId]
  );
  return rows.map((r) => r.id);
}

/** Registers (or refreshes) a device's push token for the given user. */
export async function registerDeviceToken(
  userId: number,
  tenantId: number | null,
  token: string,
  platform: 'android' | 'ios'
): Promise<void> {
  await query(
    `INSERT INTO device_tokens (user_id, tenant_id, token, platform)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (token) DO UPDATE
       SET user_id = $1, tenant_id = $2, platform = $4, last_seen_at = now()`,
    [userId, tenantId, token, platform]
  );
}

/** Removes a device token, e.g. on logout, so a shared/logged-out device
 *  stops receiving that user's pushes. */
export async function unregisterDeviceToken(userId: number, token: string): Promise<void> {
  await query(`DELETE FROM device_tokens WHERE user_id = $1 AND token = $2`, [userId, token]);
}

/**
 * Generic broadcast: resolves an audience (by target role + optional
 * city/batch filter) and sends one notification per matching user. Reused by
 * super_admin -> coaching_admin (all institutes, or filtered by city),
 * coaching_admin -> teacher/student (whole institute, or filtered by batch).
 */
export async function broadcastNotification(
  input: BroadcastInput,
  actorUserId: number | null
): Promise<{ recipientCount: number }> {
  const { title, body, targetRole, tenantId, city, batchId } = input;

  let audienceSql: string;
  let audienceParams: unknown[];

  if (targetRole === 'coaching_admin') {
    audienceSql = `
      SELECT u.tenant_id, u.id
        FROM users u
        JOIN tenants t ON t.id = u.tenant_id
       WHERE u.role = 'coaching_admin' AND u.is_active = true
         AND ($1::int IS NULL OR u.tenant_id = $1)
         AND ($2::text IS NULL OR t.city = $2)`;
    audienceParams = [tenantId, city ?? null];
  } else if (targetRole === 'teacher') {
    if (tenantId == null) {
      throw ApiError.badRequest('TENANT_REQUIRED', 'Teacher broadcasts must be scoped to one institute');
    }
    audienceSql = `
      SELECT DISTINCT u.tenant_id, u.id
        FROM users u
        JOIN teachers te ON te.user_id = u.id
        LEFT JOIN teacher_assignments tt ON tt.teacher_user_id = u.id
       WHERE u.tenant_id = $1 AND u.role = 'teacher' AND u.is_active = true
         AND ($2::int IS NULL OR tt.batch_id = $2)`;
    audienceParams = [tenantId, batchId ?? null];
  } else {
    if (tenantId == null) {
      throw ApiError.badRequest('TENANT_REQUIRED', 'Student broadcasts must be scoped to one institute');
    }
    audienceSql = `
      SELECT DISTINCT u.tenant_id, u.id
        FROM users u
        JOIN students s ON s.user_id = u.id
        LEFT JOIN batch_enrollments be ON be.student_id = s.id
       WHERE u.tenant_id = $1 AND u.role = 'student' AND u.is_active = true
         AND ($2::int IS NULL OR be.batch_id = $2)`;
    audienceParams = [tenantId, batchId ?? null];
  }

  const { rows: audience } = await query<{ tenant_id: number; id: number }>(audienceSql, audienceParams);
  const userIds = audience.map((a) => a.id);

  const { recipientCount } = await sendNotification({
    userIds,
    tenantId: targetRole === 'coaching_admin' ? null : tenantId,
    title,
    body,
    type: 'broadcast',
  });

  await writeAudit({
    tenantId: targetRole === 'coaching_admin' ? null : tenantId,
    actorUserId,
    action: 'notification_broadcast',
    entity: 'notification',
    meta: { title, targetRole, tenantId, city: city ?? null, batchId: batchId ?? null, recipientCount },
  });

  return { recipientCount };
}

/** A user's own notification inbox — generic by user_id, used by admin,
 *  teacher, and student roles alike. */
export async function listMyNotifications(userId: number): Promise<NotificationRow[]> {
  const { rows } = await query<NotificationRow>(
    `SELECT id, title, body, type, entity_id AS "entityId", is_read AS "isRead", created_at AS "createdAt"
       FROM notifications WHERE user_id = $1
      ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );
  return rows;
}

export async function unreadNotificationCount(userId: number): Promise<number> {
  const { rows } = await query<{ count: number }>(
    `SELECT count(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
  return rows[0]?.count ?? 0;
}

/** Marks one of the caller's own notifications as read — ownership enforced
 *  via the WHERE clause, not just the id. */
export async function markNotificationRead(id: number, userId: number): Promise<void> {
  const { rowCount } = await query(`UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`, [
    id,
    userId,
  ]);
  if (!rowCount) throw ApiError.notFound('NOTIFICATION_NOT_FOUND');
}
