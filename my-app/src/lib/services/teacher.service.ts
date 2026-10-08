import { after } from 'next/server';
import { query, withTransaction } from '../db';
import ApiError from '../utils/ApiError';
import { buildWaUrl, absentMessage } from './whatsapp.service';
import * as adminService from './admin.service';
import * as notificationCenter from './notificationCenter.service';
import { createMeetEvent, deleteMeetEvent } from './googleMeet.service';
import * as https from 'https';
import { randomBytes } from 'crypto';
import logger from '../utils/logger';
import { istDayOfWeek, istDateString } from '../utils/istDate';

/**
 * Fetches a URL's HTML, following up to `maxRedirects` 3xx redirects —
 * `https.get` doesn't follow redirects on its own, and youtu.be short
 * links (the default YouTube "Share" URL) always 303-redirect to
 * youtube.com/watch, so without this every short-link upload silently
 * got duration_minutes = 0. Never rejects; resolves '' on any failure
 * (network error, timeout, non-200 final response) so callers don't
 * need their own try/catch.
 */
function fetchHtml(url: string, maxRedirects = 5, timeoutMs = 5000): Promise<string> {
  return new Promise((resolve) => {
    const attempt = (currentUrl: string, redirectsLeft: number) => {
      let settled = false;
      const req = https.get(currentUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location && redirectsLeft > 0) {
          settled = true;
          res.resume(); // drain this response so the socket can close cleanly
          attempt(new URL(res.headers.location, currentUrl).toString(), redirectsLeft - 1);
          return;
        }
        if (status !== 200) {
          settled = true;
          res.resume();
          resolve('');
          return;
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          settled = true;
          resolve(data);
        });
      });
      req.on('error', () => {
        if (!settled) resolve('');
      });
      req.setTimeout(timeoutMs, () => {
        if (!settled) {
          settled = true;
          req.destroy();
          resolve('');
        }
      });
    };
    attempt(url, maxRedirects);
  });
}

/** Today's classes for this teacher (by current day_of_week). */
export interface ScheduleClass {
  batchScheduleId: number;
  batch: string;
  subject: string | null;
  subjectId: number;
  startTime: string;
  endTime: string;
  batchId: number;
}

export async function todaySchedule(
  tenantId: number,
  teacherId: number
): Promise<{ day: number; count: number; classes: ScheduleClass[] }> {
  const dow = istDayOfWeek();
  const today = istDateString();
  const { rows } = await query<ScheduleClass>(
    `SELECT bs.id AS "batchScheduleId", b.name AS batch, sub.name AS subject, bs.subject_id AS "subjectId",
            bs.start_time AS "startTime", bs.end_time AS "endTime",
            bs.batch_id AS "batchId",
            EXISTS(
              SELECT 1 FROM attendance a
              WHERE a.batch_id = bs.batch_id
                AND a.batch_schedule_id = bs.id
                AND a.date = $4::date
            ) AS "isAttendanceMarked"
       FROM teacher_assignments ta
       JOIN batch_schedule bs ON bs.batch_id = ta.batch_id AND bs.subject_id = ta.subject_id
       JOIN batches b ON b.id = bs.batch_id
       LEFT JOIN subjects sub ON sub.id = bs.subject_id
      WHERE ta.tenant_id=$1 AND ta.teacher_user_id=$2 AND bs.day_of_week=$3
      ORDER BY bs.start_time`,
    [tenantId, teacherId, dow, today]
  );
  return { day: dow, count: rows.length, classes: rows };
}

export interface MyBatch {
  id: number;
  name: string;
  studentCount: number;
  progress: number; // Placeholder for now
}

export async function myBatches(tenantId: number, teacherId: number): Promise<MyBatch[]> {
  // Find distinct batches assigned to this teacher via teacher_assignments
  const { rows } = await query<MyBatch>(
    `SELECT b.id, b.name,
            (SELECT COUNT(*) FROM batch_enrollments be WHERE be.batch_id = b.id) AS "studentCount",
            0 AS progress
       FROM batches b
      WHERE b.tenant_id = $1
        AND b.id IN (SELECT DISTINCT batch_id FROM teacher_assignments WHERE tenant_id = $1 AND teacher_user_id = $2)
      ORDER BY b.name`,
    [tenantId, teacherId]
  );
  return rows;
}

/** Students of a batch (for attendance). Verifies batch belongs to tenant. */
export interface BatchStudent {
  studentId: number;
  name: string;
  rollNo: string | null;
}

export async function batchStudents(tenantId: number, batchId: number, date?: string, subjectId?: number): Promise<any[]> {
  const b = await query(`SELECT 1 FROM batches WHERE id=$1 AND tenant_id=$2`, [batchId, tenantId]);
  if (!b.rowCount) throw ApiError.notFound('BATCH_NOT_FOUND');

  if (date) {
    // subjectId narrows to one subject's attendance row for that date —
    // without it, a batch with 2+ subjects attended the same day would
    // LEFT JOIN multiple attendance rows per student, duplicating rows.
    const { rows } = await query(
      `SELECT s.id AS "studentId", u.full_name AS name, s.roll_no AS "rollNo", a.status
         FROM batch_enrollments be
         JOIN students s ON s.id = be.student_id
         JOIN users u ON u.id = s.user_id
         LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $3 AND a.batch_id = $2
                                AND ($4::int IS NULL OR a.subject_id = $4)
        WHERE be.tenant_id=$1 AND be.batch_id=$2
        ORDER BY u.full_name`,
      [tenantId, batchId, date, subjectId ?? null]
    );
    return rows;
  } else {
    const { rows } = await query(
      `SELECT s.id AS "studentId", u.full_name AS name, s.roll_no AS "rollNo"
         FROM batch_enrollments be
         JOIN students s ON s.id = be.student_id
         JOIN users u ON u.id = s.user_id
        WHERE be.tenant_id=$1 AND be.batch_id=$2
        ORDER BY u.full_name`,
      [tenantId, batchId]
    );
    return rows;
  }
}

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface AttendanceRecord {
  studentId: number;
  status: AttendanceStatus;
}

export interface MarkAttendanceInput {
  batchId: number;
  subjectId: number;
  batchScheduleId?: number;
  date: string;
  records: AttendanceRecord[];
}

export interface AbsentReminder {
  studentId: number;
  name: string;
  waUrl: string;
}

/**
 * Bulk attendance upsert. Returns free wa.me links for every absent student's
 * parent (no paid WhatsApp API).
 */
export async function markAttendance(
  tenantId: number,
  teacherId: number,
  { batchId, subjectId, batchScheduleId, date, records }: MarkAttendanceInput
): Promise<{ saved: number; absentReminders: AbsentReminder[] }> {
  const b = await query(`SELECT 1 FROM batches WHERE id=$1 AND tenant_id=$2`, [batchId, tenantId]);
  if (!b.rowCount) throw ApiError.badRequest('INVALID_BATCH');

  // Only a teacher actually assigned to teach this subject in this batch
  // may mark its attendance — previously any teacher in the tenant could
  // mark attendance for any batch.
  const assigned = await query(
    `SELECT 1 FROM teacher_assignments WHERE tenant_id=$1 AND teacher_user_id=$2 AND batch_id=$3 AND subject_id=$4`,
    [tenantId, teacherId, batchId, subjectId]
  );
  if (!assigned.rowCount) throw ApiError.forbidden('NOT_ASSIGNED', 'You are not assigned to teach this subject in this batch.');

  const instituteRow = await query<{ name: string }>(`SELECT name FROM tenants WHERE id=$1`, [tenantId]);
  const instituteName = instituteRow.rows[0]?.name || '';

  const absentReminders: AbsentReminder[] = [];

  await withTransaction(async (client) => {
    for (const r of records) {
      await client.query(
        `INSERT INTO attendance (tenant_id, batch_schedule_id, batch_id, subject_id, student_id, date, status, marked_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (student_id, date, batch_id, subject_id)
         DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by, batch_schedule_id = EXCLUDED.batch_schedule_id`,
        [tenantId, batchScheduleId || null, batchId, subjectId, r.studentId, date, r.status, teacherId]
      );

      if (r.status === 'absent') {
        const s = await client.query<{ name: string; phone: string }>(
          `SELECT u.full_name AS name, st.parent_phone AS phone
             FROM students st JOIN users u ON u.id=st.user_id
            WHERE st.id=$1 AND st.tenant_id=$2`,
          [r.studentId, tenantId]
        );
        if (s.rows[0]) {
          const msg = absentMessage({ studentName: s.rows[0].name, instituteName, date });
          absentReminders.push({
            studentId: r.studentId,
            name: s.rows[0].name,
            waUrl: buildWaUrl(s.rows[0].phone, msg),
          });
        }
      }
    }
  });

  return { saved: records.length, absentReminders };
}

/* ─────────────── QR attendance sessions ─────────────── */

export interface QrSessionInput {
  batchId: number;
  subjectId: number;
  batchScheduleId?: number;
  validForMinutes: number;
}

export interface QrSession {
  id: number;
  token: string;
  batchId: number;
  date: string;
  expiresAt: string;
}

export async function createQrAttendanceSession(
  tenantId: number,
  teacherId: number,
  { batchId, subjectId, batchScheduleId, validForMinutes }: QrSessionInput
): Promise<QrSession> {
  const b = await query<{ name: string }>(`SELECT name FROM batches WHERE id=$1 AND tenant_id=$2`, [
    batchId,
    tenantId,
  ]);
  if (!b.rowCount) throw ApiError.badRequest('INVALID_BATCH');

  // Only a teacher actually assigned to teach this subject in this batch
  // may open a QR attendance session for it.
  const assigned = await query(
    `SELECT 1 FROM teacher_assignments WHERE tenant_id=$1 AND teacher_user_id=$2 AND batch_id=$3 AND subject_id=$4`,
    [tenantId, teacherId, batchId, subjectId]
  );
  if (!assigned.rowCount) throw ApiError.forbidden('NOT_ASSIGNED', 'You are not assigned to teach this subject in this batch.');

  // 24 random bytes -> 48 hex chars: unguessable, short enough for a
  // reliable QR scan (a JSON payload would just make the code denser).
  const token = randomBytes(24).toString('hex');

  const { rows } = await query<QrSession>(
    `INSERT INTO attendance_sessions (tenant_id, batch_id, subject_id, batch_schedule_id, created_by, token, date, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6, CURRENT_DATE, now() + ($7 || ' minutes')::interval)
     RETURNING id, token, batch_id AS "batchId", date, expires_at AS "expiresAt"`,
    [tenantId, batchId, subjectId, batchScheduleId || null, teacherId, token, validForMinutes]
  );
  const session = rows[0];

  after(() =>
    notificationCenter
      .batchStudentUserIds(tenantId, batchId)
      .then((userIds) =>
        notificationCenter.sendNotification({
          userIds,
          tenantId,
          title: 'Attendance open',
          body: `Scan the QR code now for ${b.rows[0].name} — closes in ${validForMinutes} min.`,
          type: 'attendance_open',
          entityId: session.id,
        })
      )
      .catch((err) => logger.error('Attendance-open notify failed', { error: err instanceof Error ? err.message : String(err) }))
  );

  return session;
}

export interface QrSessionStatus {
  id: number;
  token: string;
  expiresAt: string;
  expired: boolean;
  totalStudents: number;
  scannedCount: number;
  scannedStudents: { studentId: number; name: string }[];
}

export async function getQrAttendanceSessionStatus(
  tenantId: number,
  teacherId: number,
  sessionId: number
): Promise<QrSessionStatus> {
  const session = await query<{ id: number; token: string; batchId: number; expiresAt: string; expired: boolean }>(
    `SELECT id, token, batch_id AS "batchId", expires_at AS "expiresAt", (now() > expires_at) AS expired
       FROM attendance_sessions WHERE id=$1 AND tenant_id=$2 AND created_by=$3`,
    [sessionId, tenantId, teacherId]
  );
  if (!session.rows[0]) throw ApiError.notFound('SESSION_NOT_FOUND');
  const s = session.rows[0];

  const total = await query<{ count: number }>(
    `SELECT count(*)::int AS count FROM batch_enrollments WHERE batch_id=$1 AND tenant_id=$2`,
    [s.batchId, tenantId]
  );

  const scanned = await query<{ studentId: number; name: string }>(
    `SELECT s2.id AS "studentId", u.full_name AS name
       FROM attendance a
       JOIN students s2 ON s2.id = a.student_id
       JOIN users u ON u.id = s2.user_id
      WHERE a.session_id = $1
      ORDER BY u.full_name`,
    [sessionId]
  );

  return {
    id: s.id,
    token: s.token,
    expiresAt: s.expiresAt,
    expired: s.expired,
    totalStudents: total.rows[0].count,
    scannedCount: scanned.rows.length,
    scannedStudents: scanned.rows,
  };
}

/* Chapters — live inside subjects.chapters (JSONB), see migration 0033 */
export interface ChapterItem {
  id: number;
  subjectId: number;
  name: string;
}

export async function listChapters(tenantId: number, subjectId?: number): Promise<ChapterItem[]> {
  const params: any[] = [tenantId];
  let q = `SELECT id, chapters FROM subjects WHERE tenant_id=$1 AND is_active = true`;
  if (subjectId) {
    params.push(subjectId);
    q += ` AND id=$2`;
  }
  const { rows } = await query<{ id: number; chapters: { id: number; name: string }[] }>(q, params);
  return rows.flatMap((s) => s.chapters.map((ch) => ({ id: ch.id, subjectId: s.id, name: ch.name })));
}

export async function createChapter(tenantId: number, subjectId: number, name: string): Promise<ChapterItem> {
  const { rows } = await query<{ chapters: { id: number; name: string }[] }>(
    `UPDATE subjects
        SET chapters = chapters || jsonb_build_array(
              jsonb_build_object('id', nextval('subject_chapter_id_seq'), 'name', $1::text)
            )
      WHERE id = $2 AND tenant_id = $3 AND is_active = true
      RETURNING chapters`,
    [name, subjectId, tenantId]
  );
  if (!rows.length) throw ApiError.badRequest('INVALID_SUBJECT');
  const added = rows[0].chapters[rows[0].chapters.length - 1];
  return { id: added.id, subjectId, name: added.name };
}

export async function listSubjects(tenantId: number): Promise<{ id: number; name: string }[]> {
  const { rows } = await query<{ id: number; name: string }>(
    `SELECT id, name FROM subjects WHERE tenant_id=$1 ORDER BY name`,
    [tenantId]
  );
  return rows;
}

/* Content (VOD & Notes) */
export interface ContentItem {
  id: number;
  title: string;
  fileUrl: string;
  contentType: string;
  chapterId: number;
  chapterName: string;
  subjectId: number;
  batchId: number | null;
  durationMinutes: number;
  durationSeconds: number;
}

export async function listContent(tenantId: number, teacherId: number, chapterId?: number): Promise<ContentItem[]> {
  const params: any[] = [tenantId, teacherId];
  // Chapters live inside subjects.chapters (JSONB, see migration 0033) —
  // join by unnesting each subject's array and matching the content's
  // chapter_id against an element's id, same shape as the old FK join.
  let q = `
    SELECT c.id, c.title, c.file_url AS "fileUrl", c.content_type AS "contentType",
           c.chapter_id AS "chapterId", ch->>'name' AS "chapterName", s.id AS "subjectId",
           c.batch_id AS "batchId", c.duration_minutes AS "durationMinutes", c.duration_seconds AS "durationSeconds"
      FROM content c
      JOIN subjects s ON s.tenant_id = c.tenant_id
      JOIN LATERAL jsonb_array_elements(s.chapters) ch ON (ch->>'id')::int = c.chapter_id
     WHERE c.tenant_id=$1 AND c.created_by=$2
  `;
  if (chapterId) {
    params.push(chapterId);
    q += ` AND c.chapter_id=$3`;
  }
  q += ` ORDER BY c.created_at DESC`;

  const { rows } = await query<ContentItem>(q, params);
  return rows;
}

export interface CreateContentInput {
  title: string;
  fileUrl: string;
  contentType: string;
  batchId?: number;
  chapterId: number;
}

export async function createContent(
  tenantId: number,
  teacherId: number,
  { title, fileUrl, contentType, batchId, chapterId }: CreateContentInput
) {
  if (batchId) {
    const b = await query(`SELECT 1 FROM batches WHERE id=$1 AND tenant_id=$2`, [batchId, tenantId]);
    if (!b.rowCount) throw ApiError.badRequest('INVALID_BATCH');
  }
  const ch = await query(
    `SELECT 1 FROM subjects, jsonb_array_elements(chapters) e
      WHERE tenant_id=$2 AND (e->>'id')::int = $1`,
    [chapterId, tenantId]
  );
  if (!ch.rowCount) throw ApiError.badRequest('INVALID_CHAPTER');

  // duration_seconds is the exact, source-of-truth value (used for mm:ss
  // display); duration_minutes is a floor()'d fallback for older/simpler
  // "about how long" text — never rounded up, so it never overstates.
  let durationSeconds = 0;
  if (contentType === 'video' && fileUrl && (fileUrl.includes('youtube.com') || fileUrl.includes('youtu.be'))) {
    const html = await fetchHtml(fileUrl);
    const match = html.match(/<meta itemprop="duration" content="([^"]+)">/);
    if (match && match[1]) {
      const h = match[1].match(/(\d+)H/);
      const m = match[1].match(/(\d+)M/);
      const s = match[1].match(/(\d+)S/);
      const hours = h ? parseInt(h[1]) : 0;
      const mins = m ? parseInt(m[1]) : 0;
      const secs = s ? parseInt(s[1]) : 0;
      durationSeconds = hours * 3600 + mins * 60 + secs;
    }
  }
  const durationMinutes = Math.floor(durationSeconds / 60);

  const { rows } = await query(
    `INSERT INTO content (tenant_id, batch_id, chapter_id, content_type, title, file_url, created_by, duration_minutes, duration_seconds)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, title, file_url AS "fileUrl", content_type AS "contentType", chapter_id AS "chapterId", batch_id AS "batchId",
               duration_minutes AS "durationMinutes", duration_seconds AS "durationSeconds"`,
    [tenantId, batchId || null, chapterId, contentType, title, fileUrl, teacherId, durationMinutes, durationSeconds]
  );
  const content = rows[0];

  if (batchId) {
    after(() =>
      notificationCenter
        .batchStudentUserIds(tenantId, batchId)
        .then((userIds) =>
          notificationCenter.sendNotification({
            userIds,
            tenantId,
            title: 'New content uploaded',
            body: title,
            type: 'content_uploaded',
            entityId: content.id,
          })
        )
        .catch((err) => logger.error('Content-uploaded notify failed', { error: err instanceof Error ? err.message : String(err) }))
    );
  }

  return content;
}

/* Live classes */
export interface CreateLiveClassInput {
  title: string;
  batchId: number;
  scheduledAt: string;
  durationMinutes?: number;
}

export async function createLiveClass(
  tenantId: number,
  teacherId: number,
  { title, batchId, scheduledAt, durationMinutes }: CreateLiveClassInput
) {
  const b = await query<{ name: string }>(`SELECT name FROM batches WHERE id=$1 AND tenant_id=$2`, [batchId, tenantId]);
  if (!b.rowCount) throw ApiError.badRequest('INVALID_BATCH');

  const { eventId, meetUrl } = await createMeetEvent(teacherId, { title, scheduledAt, durationMinutes });

  const { rows } = await query(
    `INSERT INTO live_classes (tenant_id, batch_id, title, meet_url, scheduled_at, teacher_id, calendar_event_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, title, meet_url AS "meetUrl", scheduled_at AS "scheduledAt", batch_id AS "batchId"`,
    [tenantId, batchId, title, meetUrl, scheduledAt, teacherId, eventId]
  );
  const liveClass = rows[0];

  // Instant notification to all batch students
  const scheduledDate = new Date(scheduledAt);
  const timeStr = scheduledDate.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  const dateStr = scheduledDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' });
  after(() =>
    notificationCenter
      .batchStudentUserIds(tenantId, batchId)
      .then((userIds) =>
        notificationCenter.sendNotification({
          userIds,
          tenantId,
          title: `📹 Live Class Scheduled: ${title}`,
          body: `Your class "${title}" is scheduled on ${dateStr} at ${timeStr} in batch ${b.rows[0].name}.`,
          type: 'live_class_reminder',
          entityId: liveClass.id,
        })
      )
      .catch((err) => logger.error('Live-class-created notify failed', { error: err instanceof Error ? err.message : String(err) }))
  );

  return liveClass;
}

export interface LiveClassListItem {
  id: number;
  title: string;
  meetUrl: string;
  scheduledAt: string;
  batchId: number;
  batchName: string;
  isPast: boolean;
}

export async function listLiveClasses(
  tenantId: number,
  teacherId: number
): Promise<LiveClassListItem[]> {
  const { rows } = await query<LiveClassListItem>(
    `SELECT lc.id, lc.title, lc.meet_url AS "meetUrl",
            lc.scheduled_at AS "scheduledAt",
            lc.batch_id AS "batchId", b.name AS "batchName",
            (lc.ended_at IS NOT NULL OR lc.scheduled_at + interval '60 minutes' < now()) AS "isPast"
       FROM live_classes lc
       JOIN batches b ON b.id = lc.batch_id
      WHERE lc.tenant_id=$1 AND lc.teacher_id=$2
      ORDER BY lc.scheduled_at DESC
      LIMIT 100`,
    [tenantId, teacherId]
  );
  return rows;
}

/** Manually marks a live class as ended — the app has no way to detect when
 *  a Google Meet call actually ends (Google pushes no such event anywhere),
 *  so the "LIVE now" state is otherwise stuck on until the scheduled window
 *  passes on its own. Does not touch the underlying Calendar event/Meet
 *  link — teachers end the actual call from within Meet itself. */
export async function endLiveClass(tenantId: number, teacherId: number, id: number): Promise<void> {
  const { rowCount } = await query(
    `UPDATE live_classes SET ended_at = now()
      WHERE id=$1 AND tenant_id=$2 AND teacher_id=$3 AND ended_at IS NULL`,
    [id, tenantId, teacherId]
  );
  if (!rowCount) throw ApiError.notFound('LIVE_CLASS_NOT_FOUND');
}

export async function deleteLiveClass(
  tenantId: number,
  teacherId: number,
  id: number
): Promise<void> {
  const check = await query(
    `SELECT id, scheduled_at, calendar_event_id FROM live_classes WHERE id=$1 AND tenant_id=$2 AND teacher_id=$3`,
    [id, tenantId, teacherId]
  );
  if (!check.rowCount) throw ApiError.notFound('LIVE_CLASS_NOT_FOUND');
  const row = check.rows[0] as { id: number; scheduled_at: string; calendar_event_id: string | null };
  if (new Date(row.scheduled_at) <= new Date()) {
    throw ApiError.badRequest('CANNOT_DELETE_PAST_CLASS', 'Cannot delete a class that has already started or passed.');
  }
  if (row.calendar_event_id) {
    await deleteMeetEvent(teacherId, row.calendar_event_id).catch((err) =>
      logger.error('Failed to delete Calendar event for live class', {
        liveClassId: id,
        error: err instanceof Error ? err.message : String(err),
      })
    );
  }
  await query(`DELETE FROM live_classes WHERE id=$1`, [id]);
}

/** Free wa.me link to reply to a student's doubt. */
export async function doubtLink(
  tenantId: number,
  _teacherId: number,
  studentId: number,
  text?: string
): Promise<{ waUrl: string }> {
  const { rows } = await query<{ name: string; phone: string; institute: string }>(
    `SELECT u.full_name AS name, u.phone, t.name AS institute
       FROM students s JOIN users u ON u.id=s.user_id JOIN tenants t ON t.id=s.tenant_id
      WHERE s.id=$1 AND s.tenant_id=$2`,
    [studentId, tenantId]
  );
  if (!rows[0]) throw ApiError.notFound('STUDENT_NOT_FOUND');
  const msg = text || `Hello ${rows[0].name}, regarding your doubt - ${rows[0].institute}`;
  return { waUrl: buildWaUrl(rows[0].phone, msg) };
}

/**
 * Same academics/attendance/fees report the coaching_admin sees
 * (admin.service.getStudentDetails) — reused as-is rather than
 * duplicated, scoped by an ownership check: a teacher can only pull a
 * report for a student in one of their own assigned batches.
 */
export async function getStudentDetails(tenantId: number, teacherId: number, studentId: number) {
  const owns = await query(
    `SELECT 1 FROM batch_enrollments be
       JOIN teacher_assignments ta ON ta.batch_id = be.batch_id AND ta.tenant_id = be.tenant_id
      WHERE be.student_id = $1 AND be.tenant_id = $2 AND ta.teacher_user_id = $3
      LIMIT 1`,
    [studentId, tenantId, teacherId]
  );
  if (!owns.rowCount) throw ApiError.forbidden('NOT_YOUR_STUDENT', 'This student is not in any of your batches');
  return adminService.getStudentDetails(tenantId, studentId);
}
