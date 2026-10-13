import { after } from 'next/server';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db';
import ApiError from '../utils/ApiError';
import { generateReceiptNo } from '../utils/receipt';
import { writeAudit } from '../utils/audit';
import { buildWaUrl, feeReminderMessage } from './whatsapp.service';
import { getTenantDashboard } from './superadmin.service';
import * as notificationCenter from './notificationCenter.service';
import { sendPaymentReceiptEmail } from './notification.service';
import logger from '../utils/logger';
import { istDateString } from '../utils/istDate';
import type { PoolClient } from 'pg';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* ─────────────── Dashboard ─────────────── */
export async function dashboard(tenantId: number, month?: number, year?: number) {
  const dash = await getTenantDashboard(tenantId, month, year);
  const subRes = await query(`
    SELECT plan as "planName", status, trial_ends_at as "trialEndsAt", next_billing_date as "nextBillingDate"
    FROM subscriptions
    WHERE tenant_id = $1
  `, [tenantId]);

  return {
    ...dash,
    subscription: subRes.rows[0] || null
  };
}

/* ─────────────── Settings (Razorpay BYOG) ─────────────── */
export async function getPaymentSettings(tenantId: number) {
  const { rows } = await query(
    `SELECT razorpay_key_id AS "keyId",
            CASE WHEN razorpay_secret IS NOT NULL AND razorpay_secret != '' THEN '••••••••' ELSE NULL END AS "secretPlaceholder"
       FROM tenants WHERE id = $1`,
    [tenantId]
  );
  if (!rows[0]) throw ApiError.notFound('TENANT_NOT_FOUND');
  return {
    keyId: rows[0].keyId || '',
    configured: !!(rows[0].keyId && rows[0].secretPlaceholder),
    secretPlaceholder: rows[0].secretPlaceholder || '',
  };
}

export async function updatePaymentSettings(
  tenantId: number,
  keyId?: string | null,
  secret?: string | null
) {
  const trimmedKey = keyId?.trim() || null;
  const trimmedSecret = secret?.trim() || null;

  if (!trimmedKey) {
    await query(
      `UPDATE tenants SET razorpay_key_id = NULL, razorpay_secret = NULL WHERE id = $1`,
      [tenantId]
    );
    return { success: true, configured: false };
  }

  if (trimmedSecret && trimmedSecret !== '••••••••' && trimmedSecret !== '********') {
    await query(
      `UPDATE tenants SET razorpay_key_id = $1, razorpay_secret = $2 WHERE id = $3`,
      [trimmedKey, trimmedSecret, tenantId]
    );
  } else {
    await query(
      `UPDATE tenants SET razorpay_key_id = $1 WHERE id = $2`,
      [trimmedKey, tenantId]
    );
  }
  return { success: true, configured: true };
}

/* ─────────────── Teachers ─────────────── */
export interface TeacherItem {
  id: number;
  fullName: string;
  phone: string;
  email: string | null;
  status: string;
  leaveStart: string | null;
  leaveEnd: string | null;
}

export async function listTeachers(tenantId: number): Promise<TeacherItem[]> {
  const { rows } = await query<TeacherItem>(
    `SELECT u.id, u.full_name AS "fullName", u.phone, u.email,
            t.status, t.leave_start AS "leaveStart", t.leave_end AS "leaveEnd"
       FROM users u
       JOIN teachers t ON t.user_id = u.id
      WHERE u.tenant_id = $1 AND u.role='teacher' ORDER BY u.full_name`,
    [tenantId]
  );
  return rows;
}

export interface CreateTeacherInput {
  fullName: string;
  phone: string;
  password: string;
  email?: string;
}

export async function createTeacher(
  tenantId: number,
  actorUserId: number,
  { fullName, phone, password, email }: CreateTeacherInput
): Promise<TeacherItem> {
  // Reads the real, superadmin-configured limit from plan_catalog — never
  // a hardcoded number. A tenant not yet linked to a catalog row (legacy
  // flat-plan subscriptions, plan_catalog_id IS NULL) falls back to
  // whatever the "Basic" row itself currently says, so the limit always
  // tracks what's actually configured on the website, never drifts from it.
  const planInfo = await query<{ planName: string; teacherLimit: number }>(
    `SELECT pc.name AS "planName", pc.flat_teacher_limit AS "teacherLimit"
       FROM subscriptions s
       LEFT JOIN plan_catalog pc ON pc.id = s.plan_catalog_id
      WHERE s.tenant_id = $1`,
    [tenantId]
  );
  let planName = planInfo.rows[0]?.planName;
  let allowedTeachers = planInfo.rows[0]?.teacherLimit;

  if (allowedTeachers === undefined || allowedTeachers === null) {
    const basic = await query<{ name: string; teacherLimit: number }>(
      `SELECT name, flat_teacher_limit AS "teacherLimit" FROM plan_catalog WHERE name = 'Basic' AND is_active = true LIMIT 1`
    );
    planName = basic.rows[0]?.name ?? 'Basic';
    allowedTeachers = basic.rows[0]?.teacherLimit ?? 1;
  }

  const teacherCountRes = await query(`SELECT count(*) FROM users WHERE tenant_id = $1 AND role = 'teacher'`, [tenantId]);
  const currentTeachers = parseInt(teacherCountRes.rows[0].count, 10);

  if (currentTeachers >= allowedTeachers) {
    throw ApiError.forbidden('PLAN_LIMIT_REACHED', `Your ${planName} plan only allows up to ${allowedTeachers} teacher${allowedTeachers === 1 ? '' : 's'}.`);
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await withTransaction(async (client) => {
    const userRes = await client.query<{ id: number; fullName: string; phone: string; email: string | null }>(
      `INSERT INTO users (tenant_id, role, full_name, phone, email, password_hash)
       VALUES ($1,'teacher',$2,$3,$4,$5)
       RETURNING id, full_name AS "fullName", phone, email`,
      [tenantId, fullName, phone, email || null, hash]
    );
    await client.query(`INSERT INTO teachers (tenant_id, user_id) VALUES ($1,$2)`, [tenantId, userRes.rows[0].id]);
    return userRes.rows[0];
  });
  await writeAudit({
    tenantId,
    actorUserId,
    action: 'teacher_created',
    entity: 'user',
    entityId: user.id,
    meta: { fullName, phone },
  });
  return { ...user, status: 'active', leaveStart: null, leaveEnd: null };
}

export async function updateTeacher(
  tenantId: number,
  actorUserId: number,
  id: number,
  { fullName, phone, email, status, leaveStart, leaveEnd }: {
    fullName?: string;
    phone?: string;
    email?: string;
    status?: string;
    leaveStart?: string | null;
    leaveEnd?: string | null;
  }
): Promise<TeacherItem> {
  const exists = await query(`SELECT 1 FROM users WHERE id=$1 AND tenant_id=$2 AND role='teacher'`, [id, tenantId]);
  if (!exists.rowCount) throw ApiError.notFound('TEACHER_NOT_FOUND');

  // A teacher's email is their only channel for OTP-verified password
  // reset/change (see /auth/password/*, /auth/forgot-password) — never
  // allow clearing it to null/empty via an edit, only changing it to
  // another real address.
  if (email !== undefined && (!email || !email.trim())) {
    throw ApiError.badRequest('EMAIL_REQUIRED', 'Email cannot be removed — it is required for password reset.');
  }

  const userUpdates: string[] = [];
  const userValues: any[] = [id, tenantId];
  let ui = 3;
  if (fullName !== undefined) { userUpdates.push(`full_name=$${ui++}`); userValues.push(fullName); }
  if (phone !== undefined) { userUpdates.push(`phone=$${ui++}`); userValues.push(phone); }
  if (email !== undefined) { userUpdates.push(`email=$${ui++}`); userValues.push(email.trim()); }
  // Keep login access in sync with the teacher's status: 'inactive' must
  // actually block login (users.is_active is what auth.service checks),
  // not just change a display badge. 'active'/'on_leave' both keep login.
  if (status !== undefined) { userUpdates.push(`is_active=$${ui++}`); userValues.push(status !== 'inactive'); }
  if (userUpdates.length) {
    await query(`UPDATE users SET ${userUpdates.join(', ')} WHERE id=$1 AND tenant_id=$2`, userValues);
  }

  const teacherUpdates: string[] = [];
  const teacherValues: any[] = [id];
  let ti = 2;
  if (status !== undefined) { teacherUpdates.push(`status=$${ti++}`); teacherValues.push(status); }
  if (leaveStart !== undefined) { teacherUpdates.push(`leave_start=$${ti++}`); teacherValues.push(leaveStart || null); }
  if (leaveEnd !== undefined) { teacherUpdates.push(`leave_end=$${ti++}`); teacherValues.push(leaveEnd || null); }
  if (teacherUpdates.length) {
    await query(`UPDATE teachers SET ${teacherUpdates.join(', ')} WHERE user_id=$1`, teacherValues);
  }

  await writeAudit({ tenantId, actorUserId, action: 'teacher_updated', entity: 'user', entityId: id });

  const { rows } = await query(
    `SELECT u.id, u.full_name as "fullName", u.phone, u.email,
            t.status, t.leave_start as "leaveStart", t.leave_end as "leaveEnd"
       FROM users u JOIN teachers t ON t.user_id = u.id
      WHERE u.id=$1 AND u.tenant_id=$2`,
    [id, tenantId]
  );
  return rows[0] as any;
}

/**
 * "Removes" a teacher. This is a soft-delete, not a hard DELETE: a teacher
 * almost always has historical records pointing at their user id (timetable
 * entries, marked attendance, uploaded content, live classes), and several
 * of those foreign keys (e.g. timetable.teacher_id) are NOT NULL with no
 * cascade — a hard delete fails with a Postgres FK-violation (23503) the
 * moment any such record exists. Deactivating instead blocks login (same
 * is_active flag auth.service checks) and marks them Inactive in the
 * teacher list (same status a coaching_admin can also set manually and
 * reverse later), while keeping every historical record intact.
 */
export async function deleteTeacher(tenantId: number, actorUserId: number, id: number): Promise<void> {
  const { rowCount } = await withTransaction(async (client) => {
    const res = await client.query(
      `UPDATE users SET is_active=false WHERE id=$1 AND tenant_id=$2 AND role='teacher'`,
      [id, tenantId]
    );
    if (res.rowCount) {
      await client.query(`UPDATE teachers SET status='inactive' WHERE user_id=$1`, [id]);
    }
    return res;
  });
  if (!rowCount) throw ApiError.notFound('TEACHER_NOT_FOUND');
  await writeAudit({ tenantId, actorUserId, action: 'teacher_deleted', entity: 'user', entityId: id });
}

/* ─────────────── Students ─────────────── */
export interface StudentItem {
  id: number;
  fullName: string;
  rollNo: string | null;
  grade: string | null;
  parentName: string | null;
  parentPhone: string | null;
  phone: string;
  batchName: string | null;
  isActive: boolean;
  pendingFees: number;
  attendance: number;
}

export async function listStudents(tenantId: number, batchId: number | null): Promise<StudentItem[]> {
  const params: unknown[] = [tenantId];
  let join = '';
  if (batchId) {
    params.push(batchId);
    join = `AND be.batch_id = $2`;
  }

  // CTE to calculate attendance and fees
  const { rows } = await query<StudentItem>(
    `
      WITH student_attendance AS (
        SELECT student_id,
               COUNT(*) AS total_days,
               COUNT(*) FILTER (WHERE status = 'present') AS present_days
        FROM attendance
        WHERE tenant_id = $1
        GROUP BY student_id
      ),
      student_fees AS (
        SELECT fp.student_id,
               COALESCE(SUM(fp.amount_paid), 0) AS total_paid
        FROM fee_payments fp
        WHERE fp.tenant_id = $1
        GROUP BY fp.student_id
      ),
      student_dues AS (
        SELECT fd.student_id, COALESCE(SUM(fd.amount), 0) AS total_due
        FROM fee_dues fd
        WHERE fd.tenant_id = $1
        GROUP BY fd.student_id
      )
      SELECT s.id,
             u.full_name AS "fullName",
             s.roll_no AS "rollNo",
             s.grade,
             s.parent_name AS "parentName",
             s.parent_phone AS "parentPhone",
             u.phone,
             b.name AS "batchName",
             u.is_active AS "isActive",
             GREATEST(0, COALESCE(sd.total_due, 0) - COALESCE(sf.total_paid, 0)) AS "pendingFees",
             CASE
               WHEN sa.total_days > 0 THEN ROUND((sa.present_days::numeric / sa.total_days::numeric) * 100)
               ELSE 0
             END AS "attendance"
      FROM students s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN batch_enrollments be ON be.student_id = s.id
      LEFT JOIN batches b ON b.id = be.batch_id
      LEFT JOIN student_attendance sa ON sa.student_id = s.id
      LEFT JOIN student_fees sf ON sf.student_id = s.id
      LEFT JOIN student_dues sd ON sd.student_id = s.id
      WHERE s.tenant_id = $1 ${join}
      ORDER BY u.full_name
    `,
    params
  );

  return rows.map(r => ({
    ...r,
    pendingFees: Number(r.pendingFees) || 0,
    attendance: Number(r.attendance) || 0
  }));
}

export interface CreateStudentInput {
  fullName: string;
  phone: string;
  password: string;
  parentName?: string;
  parentPhone: string;
  grade?: string;
  rollNo?: string;
  batchId: number;
  /** Total fee amount for this student, overriding the batch's default fee_amount
   *  (split into the same number of installments). Null clears an existing
   *  override back to "use batch default"; undefined leaves it untouched. */
  feeOverrideAmount?: number | null;
}

/**
 * Auto-generates the next roll number for a tenant, e.g. "A-101" -> "A-102".
 * Format: {first letter of the institute's name}-{tenantId}{2-digit sequence
 * within that tenant, starting at 01} — matches the scheme already in use
 * (Apex Academy -> A-101, A-102; Pioneer Classes -> P-201). Locks the
 * tenant's existing roll numbers for the duration of the transaction (must
 * be called inside one) so two concurrent "auto generate" creations in the
 * same tenant can't both compute the same next number.
 */
async function nextAutoRollNo(client: PoolClient, tenantId: number): Promise<string> {
  const tenantRow = await client.query<{ name: string }>(`SELECT name FROM tenants WHERE id=$1`, [tenantId]);
  const prefix = (tenantRow.rows[0]?.name?.trim()[0] || 'S').toUpperCase();

  // Lock this tenant's roll-number rows so a concurrent auto-generate request
  // for the same tenant can't read the same "current max" before either has
  // committed its INSERT.
  const existing = await client.query<{ rollNo: string }>(
    `SELECT roll_no AS "rollNo" FROM students WHERE tenant_id=$1 AND roll_no LIKE $2 FOR UPDATE`,
    [tenantId, `${prefix}-${tenantId}%`]
  );

  let maxSeq = 0;
  const seqPattern = new RegExp(`^${prefix}-${tenantId}(\\d{2,})$`);
  for (const row of existing.rows) {
    const match = row.rollNo?.match(seqPattern);
    if (match) maxSeq = Math.max(maxSeq, parseInt(match[1], 10));
  }

  const nextSeq = String(maxSeq + 1).padStart(2, '0');
  return `${prefix}-${tenantId}${nextSeq}`;
}

/**
 * Generates a student's fee-due schedule from their batch's fee template
 * (fee_amount/installment_count), or the student's own fee_override_amount
 * if set (a total, split the same way as the batch default — e.g. a
 * scholarship student's override still gets divided into the same number
 * of installments as everyone else, just with a smaller total). A no-op if
 * the batch has no fee configured yet.
 *
 * Installment #1 is due on whichever is later of the batch's start_date or
 * the student's actual enrollment date (a student joining mid-batch owes
 * their first payment now, not backdated to the batch's original start).
 * Remaining installments are spaced evenly across the batch's start_date ->
 * end_date span; an open-ended batch (no end_date) falls back to 1-month
 * spacing per installment, matching the old monthly cadence.
 *
 * This replaces the old "is this month's due-day already past" logic,
 * which for a 1-installment ('yearly') batch could jump the due-date a
 * full 12 months ahead instead of ~1 — due-dates are now derived purely
 * from the batch's own date range, never from "today" vs. a day-of-month.
 *
 * Must run inside the same transaction as the batch_enrollments insert
 * that creates this enrollment.
 */
async function generateFeeDues(
  client: PoolClient,
  tenantId: number,
  studentId: number,
  batchId: number
): Promise<void> {
  // node-postgres parses DATE columns into local-midnight JS Date objects,
  // not strings — read as Date and normalize to UTC-midnight ourselves
  // (same approach as dueDateStr elsewhere in this file) rather than
  // assuming a string shape.
  const batchRow = await client.query<{
    feeAmount: number | null;
    installmentCount: number | null;
    startDate: Date;
    endDate: Date | null;
  }>(
    `SELECT fee_amount AS "feeAmount", installment_count AS "installmentCount",
            start_date AS "startDate", end_date AS "endDate"
       FROM batches WHERE id=$1`,
    [batchId]
  );
  const { feeAmount, installmentCount, startDate, endDate } = batchRow.rows[0] || {};
  if (!feeAmount || !installmentCount || !startDate) return; // batch has no fee configured yet

  const overrideRow = await client.query<{ feeOverrideAmount: number | null }>(
    `SELECT fee_override_amount AS "feeOverrideAmount" FROM students WHERE id=$1`,
    [studentId]
  );
  const total = overrideRow.rows[0]?.feeOverrideAmount ?? feeAmount;

  const perInstallment = Math.floor(total / installmentCount);
  const remainder = total - perInstallment * installmentCount;

  const toUtcMidnight = (d: Date): number => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const dateStr = (ms: number): string => {
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  };

  const startMs = toUtcMidnight(startDate);
  const todayMs = toUtcMidnight(new Date(`${istDateString()}T00:00:00Z`));
  const firstDueMs = Math.max(startMs, todayMs);

  // Span the remaining installments across start -> end; an open-ended
  // batch gets a 1-month-per-installment default instead.
  const spanDays = endDate
    ? Math.max(1, Math.round((toUtcMidnight(endDate) - startMs) / 86400000))
    : (installmentCount - 1) * 30;
  const stepDays = installmentCount > 1 ? Math.round(spanDays / (installmentCount - 1)) : 0;

  const label = installmentCount === 1 ? 'Full Fee' : 'Installment Fee — Part';

  for (let i = 0; i < installmentCount; i++) {
    const amount = i === installmentCount - 1 ? perInstallment + remainder : perInstallment;
    // Installment 1 always uses firstDueMs (enrollment-aware); later
    // installments are spaced from the batch's own start_date so they land
    // on consistent calendar dates regardless of when the student joined.
    const dueMs = i === 0 ? firstDueMs : startMs + stepDays * i * 86400000;
    const title = installmentCount === 1 ? label : `${label} ${i + 1}/${installmentCount}`;
    await client.query(
      `INSERT INTO fee_dues (tenant_id, student_id, batch_id, title, amount, due_date, period_index)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [tenantId, studentId, batchId, title, amount, dateStr(dueMs), i + 1]
    );
  }
}

export async function createStudent(tenantId: number, actorUserId: number, input: CreateStudentInput) {
  const { fullName, phone, password, parentName, parentPhone, grade, rollNo, batchId, feeOverrideAmount } = input;
  const hash = await bcrypt.hash(password, 10);

  return withTransaction(async (client) => {
    // Verify batch belongs to tenant and is still active before creating anything.
    const b = await client.query(`SELECT 1 FROM batches WHERE id=$1 AND tenant_id=$2 AND is_active = true`, [batchId, tenantId]);
    if (!b.rowCount) throw ApiError.badRequest('INVALID_BATCH', 'Batch not found for this tenant');

    // A missing rollNo means the admin checked "Auto generate roll number"
    // on the client — that checkbox previously did nothing server-side and
    // just left roll_no NULL. Generate a real one now.
    const finalRollNo = rollNo || (await nextAutoRollNo(client, tenantId));

    const user = (
      await client.query<{ id: number }>(
        `INSERT INTO users (tenant_id, role, full_name, phone, password_hash)
       VALUES ($1,'student',$2,$3,$4) RETURNING id`,
        [tenantId, fullName, phone, hash]
      )
    ).rows[0];

    const student = (
      await client.query<{ id: number; rollNo: string | null; parentPhone: string; grade: string | null }>(
        `INSERT INTO students (tenant_id, user_id, roll_no, parent_name, parent_phone, grade, fee_override_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, roll_no AS "rollNo", parent_phone AS "parentPhone", grade`,
        [tenantId, user.id, finalRollNo, parentName || null, parentPhone, grade || null, feeOverrideAmount ?? null]
      )
    ).rows[0];

    await client.query(
      `INSERT INTO batch_enrollments (tenant_id, batch_id, student_id) VALUES ($1,$2,$3)`,
      [tenantId, batchId, student.id]
    );

    await generateFeeDues(client, tenantId, student.id, batchId);

    await writeAudit(
      {
        tenantId,
        actorUserId,
        action: 'student_created',
        entity: 'student',
        entityId: student.id,
        meta: { fullName, phone, batchId },
      },
      client
    );

    return { ...student, id: student.id, fullName, userId: user.id };
  });
}

export interface ImportStudentRow {
  fullName: string;
  phone: string;
  password: string;
  parentName?: string;
  parentPhone: string;
  grade?: string;
  rollNo?: string;
  batchName: string;
}

export interface ImportStudentsResult {
  successCount: number;
  failureCount: number;
  failures: { row: number; fullName: string; reason: string }[];
}

/**
 * Bulk-creates students from parsed spreadsheet rows. Every row is
 * independent: a bad row (invalid batch, duplicate phone, etc.) is skipped
 * and reported, the rest still import — one typo shouldn't block an entire
 * institute's roster. All lookups/writes are scoped to `tenantId`, same as
 * `createStudent`, so a row can never target another tenant's batch or
 * collide with another tenant's phone number.
 */
export async function importStudents(
  tenantId: number,
  actorUserId: number,
  rows: ImportStudentRow[]
): Promise<ImportStudentsResult> {
  const batchRes = await query<{ id: number; name: string }>(
    `SELECT id, name FROM batches WHERE tenant_id = $1`,
    [tenantId]
  );
  const batchByName = new Map(batchRes.rows.map((b) => [b.name.trim().toLowerCase(), b.id]));

  const result: ImportStudentsResult = { successCount: 0, failureCount: 0, failures: [] };

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // +1 for header row, +1 for 1-indexing
    const row = rows[i];
    const fail = (reason: string) => {
      result.failureCount++;
      result.failures.push({ row: rowNum, fullName: row.fullName || '(blank)', reason });
    };

    try {
      if (!row.fullName?.trim()) { fail('Full name is required'); continue; }
      if (!/^\d{10,15}$/.test(row.phone || '')) { fail('Phone must be 10-15 digits'); continue; }
      if (!/^\d{10,15}$/.test(row.parentPhone || '')) { fail('Parent phone must be 10-15 digits'); continue; }
      if (!row.password || row.password.length < 6) { fail('Password must be at least 6 characters'); continue; }
      if (!row.batchName?.trim()) { fail('Batch is required'); continue; }

      const batchId = batchByName.get(row.batchName.trim().toLowerCase());
      if (!batchId) { fail(`Batch "${row.batchName}" not found`); continue; }

      const dup = await query(`SELECT 1 FROM users WHERE tenant_id = $1 AND phone = $2`, [tenantId, row.phone]);
      if (dup.rowCount) { fail(`Phone ${row.phone} already exists`); continue; }

      await createStudent(tenantId, actorUserId, {
        fullName: row.fullName.trim(),
        phone: row.phone.trim(),
        password: row.password,
        parentName: row.parentName?.trim() || undefined,
        parentPhone: row.parentPhone.trim(),
        grade: row.grade?.trim() || undefined,
        rollNo: row.rollNo?.trim() || undefined,
        batchId,
      });
      result.successCount++;
    } catch (err) {
      fail(err instanceof ApiError ? err.message : 'Unexpected error creating this student');
    }
  }

  return result;
}

export async function updateStudent(tenantId: number, actorUserId: number, id: number, input: Partial<CreateStudentInput>) {
  const { fullName, phone, password, parentName, parentPhone, grade, rollNo, batchId, feeOverrideAmount } = input;

  return withTransaction(async (client) => {
    // get user_id for student
    const s = await client.query(`SELECT user_id FROM students WHERE id=$1 AND tenant_id=$2`, [id, tenantId]);
    if (!s.rowCount) throw ApiError.notFound('STUDENT_NOT_FOUND');
    const userId = s.rows[0].user_id;

    if (fullName || phone || password) {
      const updates = [];
      const values = [];
      let idx = 1;
      if (fullName) { updates.push(`full_name=$${idx++}`); values.push(fullName); }
      if (phone) { updates.push(`phone=$${idx++}`); values.push(phone); }
      if (password) { updates.push(`password_hash=$${idx++}`); values.push(await bcrypt.hash(password, 10)); }
      if (updates.length > 0) {
        values.push(userId, tenantId);
        await client.query(`UPDATE users SET ${updates.join(', ')} WHERE id=$${idx++} AND tenant_id=$${idx}`, values);
      }
    }

    if (parentName !== undefined || parentPhone !== undefined || grade !== undefined || rollNo !== undefined || feeOverrideAmount !== undefined) {
      const updates = [];
      const values = [];
      let idx = 1;
      if (parentName !== undefined) { updates.push(`parent_name=$${idx++}`); values.push(parentName || null); }
      if (parentPhone !== undefined) { updates.push(`parent_phone=$${idx++}`); values.push(parentPhone); }
      if (grade !== undefined) { updates.push(`grade=$${idx++}`); values.push(grade || null); }
      if (rollNo !== undefined) { updates.push(`roll_no=$${idx++}`); values.push(rollNo || null); }
      // Only affects fee_dues generated AFTER this change (a future re-enrollment) —
      // never retroactively regenerates dues already created for this student.
      if (feeOverrideAmount !== undefined) { updates.push(`fee_override_amount=$${idx++}`); values.push(feeOverrideAmount); }
      if (updates.length > 0) {
        values.push(id, tenantId);
        await client.query(`UPDATE students SET ${updates.join(', ')} WHERE id=$${idx++} AND tenant_id=$${idx}`, values);
      }
    }

    if (batchId) {
      const b = await client.query(`SELECT 1 FROM batches WHERE id=$1 AND tenant_id=$2 AND is_active = true`, [batchId, tenantId]);
      if (!b.rowCount) throw ApiError.badRequest('INVALID_BATCH', 'Batch not found for this tenant');

      const be = await client.query(`SELECT 1 FROM batch_enrollments WHERE student_id=$1 AND tenant_id=$2`, [id, tenantId]);
      if (be.rowCount) {
        await client.query(`UPDATE batch_enrollments SET batch_id=$1 WHERE student_id=$2 AND tenant_id=$3`, [batchId, id, tenantId]);
      } else {
        await client.query(`INSERT INTO batch_enrollments (tenant_id, batch_id, student_id) VALUES ($1,$2,$3)`, [tenantId, batchId, id]);
      }
      // Deliberately does NOT call generateFeeDues here: switching an
      // existing student's batch must never silently create a second,
      // overlapping due-schedule on top of whatever they already owe.
    }

    await writeAudit({ tenantId, actorUserId, action: 'student_updated', entity: 'student', entityId: id }, client);
    return { success: true };
  });
}

/**
 * Removes a student. `users.id -> students` cascades on delete, and
 * `batch_enrollments` cascades from `students` too, but `attendance`,
 * `fee_payments`, and `test_results` all reference students.id as NOT NULL
 * with NO cascade — so a hard DELETE on a student with any attendance, fee
 * payment, or test result history fails with a Postgres FK-violation
 * (23503), exactly like the teacher-delete bug this mirrors. A student with
 * none of that history (brand new, never attended/paid/tested) is
 * hard-deleted; otherwise the account is deactivated (same `users.is_active`
 * flag suspend already uses) so the history stays intact and the student
 * can no longer log in.
 */
export async function deleteStudent(tenantId: number, actorUserId: number, id: number): Promise<{ softDeleted: boolean }> {
  const { rows } = await query<{ user_id: number }>(
    `SELECT user_id FROM students WHERE id=$1 AND tenant_id=$2`,
    [id, tenantId]
  );
  if (!rows[0]) throw ApiError.notFound('STUDENT_NOT_FOUND');
  const userId = rows[0].user_id;

  const { rows: depRows } = await query<{ has_dependents: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM attendance WHERE student_id=$1
       UNION ALL SELECT 1 FROM fee_payments WHERE student_id=$1
       UNION ALL SELECT 1 FROM test_results WHERE student_id=$1
     ) AS has_dependents`,
    [id]
  );
  const hasDependents = depRows[0]?.has_dependents ?? false;

  if (!hasDependents) {
    await query(`DELETE FROM users WHERE id=$1 AND tenant_id=$2`, [userId, tenantId]);
    await writeAudit({ tenantId, actorUserId, action: 'student_deleted', entity: 'student', entityId: id });
    return { softDeleted: false };
  }

  await query(`UPDATE users SET is_active=false WHERE id=$1 AND tenant_id=$2`, [userId, tenantId]);
  await writeAudit({ tenantId, actorUserId, action: 'student_deactivated', entity: 'student', entityId: id });
  return { softDeleted: true };
}

export async function suspendStudent(tenantId: number, actorUserId: number, id: number): Promise<{ isSuspended: boolean }> {
  // Get student's user_id first
  const { rows } = await query<{ user_id: number; is_active: boolean }>(
    `SELECT u.id AS user_id, u.is_active
     FROM students s JOIN users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.tenant_id = $2`,
    [id, tenantId]
  );
  if (!rows[0]) throw ApiError.notFound('STUDENT_NOT_FOUND');

  // Toggle: if currently active → suspend; if suspended → unsuspend
  const newStatus = !rows[0].is_active;
  await query(`UPDATE users SET is_active = $1 WHERE id = $2`, [newStatus, rows[0].user_id]);
  await writeAudit({
    tenantId,
    actorUserId,
    action: newStatus ? 'student_unsuspended' : 'student_suspended',
    entity: 'student',
    entityId: id,
  });
  return { isSuspended: !newStatus };
}

export async function getStudentDetails(tenantId: number, id: number) {
  // Verify student
  const { rows: studentRows } = await query(`SELECT roll_no, grade FROM students WHERE id=$1 AND tenant_id=$2`, [id, tenantId]);
  if (!studentRows.length) throw ApiError.notFound('STUDENT_NOT_FOUND');
  const studentBasic = studentRows[0];

  // Academics: Subjects, test marks
  const { rows: testRows } = await query(
    `SELECT
       s.name AS "name",
       SUM(tr.marks_obtained)::int AS "marks",
       SUM(t.max_marks)::int AS "total"
     FROM test_results tr
     JOIN tests t ON t.id = tr.test_id
     JOIN subjects s ON s.id = t.subject_id
     WHERE tr.student_id = $1 AND tr.tenant_id = $2
     GROUP BY s.name`,
    [id, tenantId]
  );

  let totalMarks = 0, totalMax = 0;
  const subjects = testRows.map(r => {
    totalMarks += r.marks;
    totalMax += r.total;
    const pct = r.total > 0 ? (r.marks / r.total) : 0;
    const grade = r.total > 0
      ? (pct >= 0.85 ? 'A' : pct >= 0.70 ? 'B' : pct >= 0.50 ? 'C' : 'D')
      : 'N/A';
    return { name: r.name, marks: r.marks, total: r.total, grade };
  });
  const overallPct = totalMax > 0 ? (totalMarks / totalMax) : 0;
  const overallGrade = totalMax > 0
    ? (overallPct >= 0.85 ? 'A' : overallPct >= 0.70 ? 'B' : overallPct >= 0.50 ? 'C' : 'D')
    : 'N/A';

  // Attendance: overall + monthly
  const { rows: attStats } = await query(
    `SELECT
       COUNT(*)::int AS "totalDays",
       COUNT(*) FILTER (WHERE status = 'present')::int AS "presentDays",
       COUNT(*) FILTER (WHERE status = 'absent')::int AS "absentDays"
     FROM attendance
     WHERE student_id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );

  const { rows: attMonthly } = await query(
    `SELECT
       to_char(date, 'Month YYYY') AS "month",
       COUNT(*)::int AS "total",
       COUNT(*) FILTER (WHERE status = 'present')::int AS "present"
     FROM attendance
     WHERE student_id = $1 AND tenant_id = $2
     GROUP BY to_char(date, 'Month YYYY'), date_trunc('month', date)
     ORDER BY date_trunc('month', date) DESC
     LIMIT 12`,
    [id, tenantId]
  );

  // Fees: payments history
  const { rows: feeHistory } = await query(
    `SELECT
       fp.paid_on AS "date",
       fp.amount_paid AS "amount",
       fp.method,
       fp.receipt_no AS "receiptNo",
       COALESCE(fd.title, 'Payment') AS "desc"
     FROM fee_payments fp
     LEFT JOIN fee_dues fd ON fd.id = fp.fee_due_id
     WHERE fp.student_id = $1 AND fp.tenant_id = $2
     ORDER BY fp.paid_on DESC`,
    [id, tenantId]
  );

  // Fees: Overview & Installments — now per-student (fee_dues), not a
  // batch-shared list, so amounts already reflect this student's own
  // override/history instead of a proxy shared with every batch-mate.
  const { rows: feeDues } = await query(
    `SELECT fd.id, fd.title, fd.amount, fd.due_date AS "dueDate"
     FROM fee_dues fd
     WHERE fd.student_id = $1 AND fd.tenant_id = $2
     ORDER BY fd.due_date ASC NULLS LAST, fd.period_index ASC`,
    [id, tenantId]
  );

  const totalPaid = feeHistory.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalFees = feeDues.reduce((acc, curr) => acc + Number(curr.amount), 0);

  let remainingPaid = totalPaid;
  const installments = feeDues.map((fs, idx) => {
    let status = 'Upcoming';
    let amountPaidForThis = 0;

    if (remainingPaid >= Number(fs.amount)) {
      status = 'Paid';
      amountPaidForThis = Number(fs.amount);
      remainingPaid -= Number(fs.amount);
    } else if (remainingPaid > 0) {
      status = 'Pending';
      amountPaidForThis = remainingPaid;
      remainingPaid = 0;
    } else {
      if (fs.dueDate && new Date(fs.dueDate) < new Date()) {
        status = 'Overdue';
      } else {
        status = 'Pending'; // or upcoming depending on exact mockup phrasing, usually if due_date is in future it's pending if it's the current one, else upcoming.
        // Let's use 'Upcoming' if it's not the first pending one, but for simplicity:
        status = 'Pending';
      }
    }

    return {
      id: fs.id,
      title: fs.title || `Installment ${idx + 1}`,
      amount: Number(fs.amount),
      dueDate: fs.dueDate,
      status,
      amountPaidForThis
    };
  });

  const nextPendingInstallment = installments.find(i => i.status === 'Pending' || i.status === 'Overdue');
  const nextDueDate = nextPendingInstallment?.dueDate || null;
  const lastPayment = feeHistory.length > 0 ? { date: feeHistory[0].date, amount: feeHistory[0].amount } : null;

  return {
    student: {
      roll_no: studentBasic.roll_no,
      grade: studentBasic.grade,
    },
    academics: {
      overallPercentage: (overallPct * 100).toFixed(1),
      grade: overallGrade,
      subjects
    },
    attendance: {
      totalDays: attStats[0]?.totalDays || 0,
      presentDays: attStats[0]?.presentDays || 0,
      absentDays: attStats[0]?.absentDays || 0,
      monthly: attMonthly.map(m => ({
        month: (m.month as string).trim(), // to_char pads with spaces
        present: m.present,
        total: m.total
      }))
    },
    fees: {
      overview: {
        total: totalFees,
        paid: totalPaid,
        pending: Math.max(0, totalFees - totalPaid),
        lastPayment,
        nextDue: nextDueDate,
      },
      installments,
      history: feeHistory.map(f => ({
        date: f.date,
        amount: f.amount,
        status: 'Paid',
        desc: f.desc,
        method: f.method,
        receiptNo: f.receiptNo
      }))
    }
  };
}

/* ─────────────── Batches ─────────────── */
export interface BatchItem {
  id: number;
  name: string;
  grade: string | null;
  studentCount: number;
  subjectIds: number[];
  subjectNames: string[];
  subjects: { id: number; name: string }[];
  feeAmount: number | null;
  /** Number of equal installments the total feeAmount is split into
   *  (1 = one-time payment). Paired with feeAmount — both set or both
   *  null, enforced by batches_fee_amount_installments_pair. */
  installmentCount: number | null;
  startDate: string;
  /** Null = ongoing/open-ended batch with no planned end. */
  endDate: string | null;
}

export async function listBatches(tenantId: number): Promise<BatchItem[]> {
  const { rows } = await query<BatchItem>(
    `SELECT b.id, b.name, b.grade, b.subject_ids AS "subjectIds",
            b.fee_amount AS "feeAmount", b.installment_count AS "installmentCount",
            b.start_date AS "startDate", b.end_date AS "endDate",
            (SELECT count(*)::int FROM batch_enrollments be WHERE be.batch_id=b.id) AS "studentCount",
            COALESCE(
              (SELECT array_agg(s.name ORDER BY s.name) FROM subjects s WHERE s.id = ANY(b.subject_ids)),
              ARRAY[]::text[]
            ) AS "subjectNames",
            -- Paired {id, name} objects — subjectIds/subjectNames above
            -- are two separately-ordered arrays and must never be zipped
            -- by index; this is the correctly-paired alternative.
            COALESCE(
              (SELECT jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name) ORDER BY s.name)
                 FROM subjects s WHERE s.id = ANY(b.subject_ids)),
              '[]'::jsonb
            ) AS "subjects"
       FROM batches b WHERE b.tenant_id=$1 AND b.is_active = true ORDER BY b.created_at DESC`,
    [tenantId]
  );
  return rows;
}

export async function createBatch(
  tenantId: number,
  { name, grade, subjectIds, feeAmount, installmentCount, startDate, endDate }: {
    name: string;
    grade?: string;
    subjectIds?: number[];
    feeAmount?: number;
    installmentCount?: number;
    startDate: string;
    endDate?: string;
  }
): Promise<BatchItem> {
  const ids = subjectIds ?? [];
  if (ids.length) {
    const owned = await query<{ count: number }>(
      `SELECT count(*)::int AS count FROM subjects WHERE tenant_id=$1 AND id = ANY($2::int[])`,
      [tenantId, ids]
    );
    if (owned.rows[0].count !== ids.length) throw ApiError.badRequest('INVALID_SUBJECT');
  }
  if (endDate && endDate < startDate) {
    throw ApiError.badRequest('INVALID_DATE_RANGE', 'End date cannot be before start date');
  }

  const { rows } = await query<{
    id: number; name: string; grade: string | null; subjectIds: number[];
    feeAmount: number | null; installmentCount: number | null; startDate: string; endDate: string | null;
  }>(
    `INSERT INTO batches (tenant_id, name, grade, subject_ids, fee_amount, installment_count, start_date, end_date)
     VALUES ($1,$2,$3,$4::int[],$5,$6,$7,$8)
     RETURNING id, name, grade, subject_ids AS "subjectIds", fee_amount AS "feeAmount",
               installment_count AS "installmentCount", start_date AS "startDate", end_date AS "endDate"`,
    [tenantId, name, grade || null, ids, feeAmount ?? null, installmentCount ?? null, startDate, endDate ?? null]
  );
  return { ...rows[0], studentCount: 0, subjectNames: [], subjects: [] };
}

export async function updateBatch(
  tenantId: number,
  id: number,
  actorUserId: number,
  { name, grade, subjectIds, feeAmount, installmentCount, startDate, endDate }: {
    name?: string;
    grade?: string;
    subjectIds?: number[];
    feeAmount?: number | null;
    installmentCount?: number | null;
    startDate?: string;
    endDate?: string | null;
  }
): Promise<BatchItem> {
  const existing = await query<{ startDate: string; endDate: string | null }>(
    `SELECT start_date AS "startDate", end_date AS "endDate" FROM batches WHERE id=$1 AND tenant_id=$2 AND is_active = true`,
    [id, tenantId]
  );
  if (!existing.rows[0]) throw ApiError.notFound('BATCH_NOT_FOUND');

  if (subjectIds !== undefined && subjectIds.length) {
    const owned = await query<{ count: number }>(
      `SELECT count(*)::int AS count FROM subjects WHERE tenant_id=$1 AND id = ANY($2::int[])`,
      [tenantId, subjectIds]
    );
    if (owned.rows[0].count !== subjectIds.length) throw ApiError.badRequest('INVALID_SUBJECT');
  }

  const effectiveStart = startDate ?? existing.rows[0].startDate;
  const effectiveEnd = endDate !== undefined ? endDate : existing.rows[0].endDate;
  if (effectiveEnd && effectiveEnd < effectiveStart) {
    throw ApiError.badRequest('INVALID_DATE_RANGE', 'End date cannot be before start date');
  }

  const setClauses: string[] = [];
  const values: unknown[] = [id, tenantId];
  let idx = 3;
  if (name !== undefined) { setClauses.push(`name=$${idx++}`); values.push(name); }
  if (grade !== undefined) { setClauses.push(`grade=$${idx++}`); values.push(grade || null); }
  if (subjectIds !== undefined) { setClauses.push(`subject_ids=$${idx++}::int[]`); values.push(subjectIds); }
  if (startDate !== undefined) { setClauses.push(`start_date=$${idx++}`); values.push(startDate); }
  if (endDate !== undefined) { setClauses.push(`end_date=$${idx++}`); values.push(endDate); }
  // fee_amount/installment_count are a pair (DB requires both-or-neither) —
  // only touched when the caller actually sends one of them, and always
  // written together so an update can never leave one set without the other.
  // This never touches fee_dues already generated for existing students —
  // only NEW enrollments read the batch's fee template going forward.
  if (feeAmount !== undefined || installmentCount !== undefined) {
    setClauses.push(`fee_amount=$${idx++}`); values.push(feeAmount ?? null);
    setClauses.push(`installment_count=$${idx++}`); values.push(installmentCount ?? null);
  }

  if (setClauses.length) {
    await query(`UPDATE batches SET ${setClauses.join(', ')} WHERE id=$1 AND tenant_id=$2`, values);
  }

  await writeAudit({ tenantId, actorUserId, action: 'batch_updated', entity: 'batch', entityId: id });

  return listBatches(tenantId).then((batches) => {
    const updated = batches.find((b) => b.id === id);
    if (!updated) throw ApiError.notFound('BATCH_NOT_FOUND');
    return updated;
  });
}

/**
 * Removes a batch. A batch with zero enrolled students is hard-deleted —
 * nothing references it, so this is always safe. A batch with students (and
 * therefore likely attendance/fee/timetable history — several of those
 * foreign keys are NOT NULL with no cascade, so a hard delete would fail
 * with a Postgres FK-violation) is soft-deleted instead: it's marked
 * inactive and disappears from the active batch list, while every
 * historical record tied to it stays intact. The mobile app is expected to
 * warn the admin and get explicit confirmation before calling this when the
 * batch has students — this function itself doesn't re-confirm, it just
 * picks the safe deletion strategy for whichever state the batch is in.
 */
export async function deleteBatch(tenantId: number, id: number, actorUserId: number): Promise<{ softDeleted: boolean }> {
  const { rows } = await query<{ studentCount: number }>(
    `SELECT count(*)::int AS "studentCount" FROM batch_enrollments WHERE batch_id=$1`,
    [id]
  );
  const studentCount = rows[0]?.studentCount ?? 0;

  if (studentCount === 0) {
    const { rowCount } = await query(`DELETE FROM batches WHERE id=$1 AND tenant_id=$2`, [id, tenantId]);
    if (!rowCount) throw ApiError.notFound('BATCH_NOT_FOUND');
    await writeAudit({ tenantId, actorUserId, action: 'batch_deleted', entity: 'batch', entityId: id });
    return { softDeleted: false };
  }

  const { rowCount } = await query(`UPDATE batches SET is_active=false WHERE id=$1 AND tenant_id=$2`, [id, tenantId]);
  if (!rowCount) throw ApiError.notFound('BATCH_NOT_FOUND');
  await writeAudit({ tenantId, actorUserId, action: 'batch_deactivated', entity: 'batch', entityId: id, meta: { studentCount } });
  return { softDeleted: true };
}

/* ─────────────── Subjects ─────────────── */
export interface SubjectItem {
  id: number;
  name: string;
}

export async function listSubjects(tenantId: number): Promise<SubjectItem[]> {
  const { rows } = await query<SubjectItem>(
    `SELECT id, name FROM subjects WHERE tenant_id=$1 AND is_active = true ORDER BY name`,
    [tenantId]
  );
  return rows;
}

export async function createSubject(
  tenantId: number,
  { name }: { name: string }
): Promise<SubjectItem> {
  const { rows } = await query<SubjectItem>(
    `INSERT INTO subjects (tenant_id, name) VALUES ($1,$2)
     RETURNING id, name`,
    [tenantId, name]
  );
  return rows[0];
}

export async function updateSubject(
  tenantId: number,
  subjectId: number,
  { name }: { name: string }
): Promise<SubjectItem> {
  const { rows } = await query<SubjectItem>(
    `UPDATE subjects SET name = $1
      WHERE id = $2 AND tenant_id = $3 AND is_active = true
      RETURNING id, name`,
    [name, subjectId, tenantId]
  );
  if (rows.length === 0) throw ApiError.notFound('SUBJECT_NOT_FOUND');
  return rows[0];
}

/* ─────────────── Batch-Subject Chapters ───────────────
 * Curriculum (chapters) is owned by the (batch, subject) pair, not the
 * subject itself — a subject like "Maths" is a tenant-wide tag reused
 * across unrelated batches/grades (Class 5 "Maths" and Class 10 "Maths"
 * have unrelated curricula despite sharing a subject name). This mirrors
 * the (batch_id, subject_id) junction shape batch_schedule and
 * teacher_assignments already use. See migration 0036.
 */
export interface BatchSubjectChapterItem {
  id: number;
  name: string;
  /** Present only once marked complete — who taught it and when, so a
   *  teacher picking up a batch mid-year can see exactly where the
   *  previous teacher left off instead of re-teaching covered ground. */
  completedAt?: string | null;
  completedByUserId?: number | null;
}

/** Adds `chapterNumber` (1-based, by array position) and resolves
 *  `completedByName` from `completedByUserId` for display — both derived
 *  fresh on every read, never stored, so reordering/renaming never leaves
 *  stale data behind. */
export interface BatchSubjectChapterWithNumber extends BatchSubjectChapterItem {
  chapterNumber: number;
  completedByName?: string | null;
}

/** Exported for reuse by teacher.service.ts, which reads/writes the same
 *  batch_subject_chapters rows under a teacher-scoped authorization check. */
export async function withChapterNumbers(
  tenantId: number,
  chapters: BatchSubjectChapterItem[]
): Promise<BatchSubjectChapterWithNumber[]> {
  const completerIds = [...new Set(chapters.map((ch) => ch.completedByUserId).filter((id): id is number => !!id))];
  let namesById = new Map<number, string>();
  if (completerIds.length) {
    const { rows } = await query<{ id: number; fullName: string }>(
      `SELECT id, full_name AS "fullName" FROM users WHERE tenant_id=$1 AND id = ANY($2::int[])`,
      [tenantId, completerIds]
    );
    namesById = new Map(rows.map((r) => [r.id, r.fullName]));
  }
  return chapters.map((ch, i) => ({
    ...ch,
    chapterNumber: i + 1,
    completedByName: ch.completedByUserId ? (namesById.get(ch.completedByUserId) ?? null) : null,
  }));
}

async function ensureBatchTeachesSubject(tenantId: number, batchId: number, subjectId: number): Promise<void> {
  const { rowCount } = await query(
    `SELECT 1 FROM batches WHERE id=$1 AND tenant_id=$2 AND is_active = true AND $3 = ANY(subject_ids)`,
    [batchId, tenantId, subjectId]
  );
  if (!rowCount) throw ApiError.badRequest('INVALID_BATCH_SUBJECT', 'This subject is not part of this batch');
}

export async function listBatchSubjectChapters(
  tenantId: number,
  batchId: number,
  subjectId: number
): Promise<BatchSubjectChapterWithNumber[]> {
  const { rows } = await query<{ chapters: BatchSubjectChapterItem[] }>(
    `SELECT chapters FROM batch_subject_chapters WHERE tenant_id=$1 AND batch_id=$2 AND subject_id=$3`,
    [tenantId, batchId, subjectId]
  );
  return withChapterNumbers(tenantId, rows[0]?.chapters ?? []);
}

/** Adds a chapter to this batch+subject's chapter list. Id comes from
 *  `subject_chapter_id_seq` (tenant-wide unique, shared with the
 *  identical teacher-side function) so content.chapter_id values stay
 *  unambiguous — there's no FK to enforce this since chapters live in a
 *  JSONB array, not their own table. Blocks a duplicate name (case/space
 *  insensitive) within the same batch+subject — "Chapter 1" can't be
 *  added twice to the same offering by mistake. Its chapterNumber is
 *  simply its new position (end of the list), appended, not stored. */
export async function addBatchSubjectChapter(
  tenantId: number,
  batchId: number,
  subjectId: number,
  { name }: { name: string }
): Promise<BatchSubjectChapterWithNumber[]> {
  await ensureBatchTeachesSubject(tenantId, batchId, subjectId);

  const existing = await query<{ chapters: BatchSubjectChapterItem[] }>(
    `SELECT chapters FROM batch_subject_chapters WHERE tenant_id=$1 AND batch_id=$2 AND subject_id=$3`,
    [tenantId, batchId, subjectId]
  );
  const normalizedNew = name.trim().toLowerCase();
  const isDuplicate = (existing.rows[0]?.chapters ?? []).some(
    (ch) => ch.name.trim().toLowerCase() === normalizedNew
  );
  if (isDuplicate) {
    throw ApiError.conflict('CHAPTER_ALREADY_EXISTS', `A chapter named "${name.trim()}" already exists in this subject for this batch.`);
  }

  const { rows } = await query<{ chapters: BatchSubjectChapterItem[] }>(
    `INSERT INTO batch_subject_chapters (tenant_id, batch_id, subject_id, chapters)
     VALUES ($1, $2, $3, jsonb_build_array(jsonb_build_object('id', nextval('subject_chapter_id_seq'), 'name', $4::text)))
     ON CONFLICT (batch_id, subject_id) DO UPDATE
       SET chapters = batch_subject_chapters.chapters || jsonb_build_array(
             jsonb_build_object('id', nextval('subject_chapter_id_seq'), 'name', $4::text)
           )
     RETURNING chapters`,
    [tenantId, batchId, subjectId, name.trim()]
  );
  return withChapterNumbers(tenantId, rows[0].chapters);
}

/** Renames one chapter in place — the array order (and therefore every
 *  chapter's position-derived number) and every content row's chapter_id
 *  are untouched, only that element's name changes. Blocks renaming to a
 *  name that duplicates another chapter already in this batch+subject. */
export async function renameBatchSubjectChapter(
  tenantId: number,
  batchId: number,
  subjectId: number,
  chapterId: number,
  { name }: { name: string }
): Promise<BatchSubjectChapterWithNumber[]> {
  const existing = await query<{ chapters: BatchSubjectChapterItem[] }>(
    `SELECT chapters FROM batch_subject_chapters WHERE tenant_id=$1 AND batch_id=$2 AND subject_id=$3`,
    [tenantId, batchId, subjectId]
  );
  const normalizedNew = name.trim().toLowerCase();
  const isDuplicate = (existing.rows[0]?.chapters ?? []).some(
    (ch) => ch.id !== chapterId && ch.name.trim().toLowerCase() === normalizedNew
  );
  if (isDuplicate) {
    throw ApiError.conflict('CHAPTER_ALREADY_EXISTS', `A chapter named "${name.trim()}" already exists in this subject for this batch.`);
  }

  const { rows } = await query<{ chapters: BatchSubjectChapterItem[] }>(
    `UPDATE batch_subject_chapters
        SET chapters = (
          SELECT jsonb_agg(
            CASE WHEN (ch->>'id')::int = $1 THEN jsonb_set(ch, '{name}', to_jsonb($2::text)) ELSE ch END
          )
          FROM jsonb_array_elements(chapters) ch
        )
      WHERE tenant_id = $3 AND batch_id = $4 AND subject_id = $5
        AND EXISTS (SELECT 1 FROM jsonb_array_elements(chapters) ch WHERE (ch->>'id')::int = $1)
      RETURNING chapters`,
    [chapterId, name.trim(), tenantId, batchId, subjectId]
  );
  if (!rows.length) throw ApiError.notFound('CHAPTER_NOT_FOUND');
  return withChapterNumbers(tenantId, rows[0].chapters);
}

/** Removes a chapter — blocked if any content was ever uploaded under it,
 *  since content.chapter_id would otherwise dangle with nothing (no FK,
 *  no table) left to catch the orphan. */
export async function removeBatchSubjectChapter(
  tenantId: number,
  batchId: number,
  subjectId: number,
  chapterId: number
): Promise<BatchSubjectChapterWithNumber[]> {
  const { rowCount: hasContent } = await query(`SELECT 1 FROM content WHERE tenant_id=$1 AND chapter_id=$2`, [
    tenantId,
    chapterId,
  ]);
  if (hasContent) throw ApiError.conflict('CHAPTER_HAS_CONTENT', 'This chapter has content under it and cannot be removed.');

  const { rows } = await query<{ chapters: BatchSubjectChapterItem[] }>(
    `UPDATE batch_subject_chapters
        SET chapters = COALESCE((
          SELECT jsonb_agg(ch) FROM jsonb_array_elements(chapters) ch WHERE (ch->>'id')::int != $1
        ), '[]'::jsonb)
      WHERE tenant_id = $2 AND batch_id = $3 AND subject_id = $4
      RETURNING chapters`,
    [chapterId, tenantId, batchId, subjectId]
  );
  if (!rows.length) throw ApiError.notFound('SUBJECT_NOT_FOUND');
  return withChapterNumbers(tenantId, rows[0].chapters);
}

/** Marks a chapter taught/complete (or reverts it back to incomplete).
 *  `completed: true` stamps the acting user + now(); `false` clears both
 *  back to unset — this is a soft, reversible status (not a lock), so a
 *  mistaken mark can always be undone. The chapter's name stays editable
 *  either way; nothing about this blocks renaming or reordering.
 *  Shared by both the admin and teacher routes — either role may mark
 *  progress on a chapter they have access to. */
export async function toggleBatchSubjectChapterComplete(
  tenantId: number,
  batchId: number,
  subjectId: number,
  chapterId: number,
  actorUserId: number,
  completed: boolean
): Promise<BatchSubjectChapterWithNumber[]> {
  const { rows } = await query<{ chapters: BatchSubjectChapterItem[] }>(
    `UPDATE batch_subject_chapters
        SET chapters = (
          SELECT jsonb_agg(
            CASE WHEN (ch->>'id')::int = $1 THEN
              CASE WHEN $2::boolean
                THEN ch || jsonb_build_object('completedAt', to_jsonb(now()), 'completedByUserId', to_jsonb($5::int))
                ELSE (ch - 'completedAt') - 'completedByUserId'
              END
            ELSE ch END
          )
          FROM jsonb_array_elements(chapters) ch
        )
      WHERE tenant_id = $3 AND batch_id = $4 AND subject_id = $6
        AND EXISTS (SELECT 1 FROM jsonb_array_elements(chapters) ch WHERE (ch->>'id')::int = $1)
      RETURNING chapters`,
    [chapterId, completed, tenantId, batchId, actorUserId, subjectId]
  );
  if (!rows.length) throw ApiError.notFound('CHAPTER_NOT_FOUND');
  return withChapterNumbers(tenantId, rows[0].chapters);
}

/**
 * Removes/renames a subject with the same soft-delete-if-has-dependents
 * pattern deleteStudent/deleteTeacher/deleteBatch already use — subjects
 * used to be the one entity that hard-deleted unconditionally, silently
 * cascading away content attached via a chapter and raw-erroring on
 * content/tests attached directly. Checks every real reference: tests,
 * batch_schedule, teacher_assignments, batch_subject_chapters, and
 * batches.subject_ids (a plain INT[] with no FK, so it needs its own
 * manual check).
 */
export async function deleteSubject(tenantId: number, subjectId: number, actorUserId: number): Promise<{ softDeleted: boolean }> {
  const { rowCount: exists } = await query(`SELECT 1 FROM subjects WHERE id=$1 AND tenant_id=$2`, [subjectId, tenantId]);
  if (!exists) throw ApiError.notFound('SUBJECT_NOT_FOUND');

  const { rows: depRows } = await query<{ has_dependents: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM tests WHERE subject_id=$1
       UNION ALL SELECT 1 FROM batch_schedule WHERE subject_id=$1
       UNION ALL SELECT 1 FROM teacher_assignments WHERE subject_id=$1
       UNION ALL SELECT 1 FROM batch_subject_chapters WHERE subject_id=$1
       UNION ALL SELECT 1 FROM batches WHERE $1 = ANY(subject_ids)
     ) AS has_dependents`,
    [subjectId]
  );
  const hasDependents = depRows[0]?.has_dependents ?? false;

  if (!hasDependents) {
    await query(`DELETE FROM subjects WHERE id=$1 AND tenant_id=$2`, [subjectId, tenantId]);
    await writeAudit({ tenantId, actorUserId, action: 'subject_deleted', entity: 'subject', entityId: subjectId });
    return { softDeleted: false };
  }

  await query(`UPDATE subjects SET is_active=false WHERE id=$1 AND tenant_id=$2`, [subjectId, tenantId]);
  await writeAudit({ tenantId, actorUserId, action: 'subject_deactivated', entity: 'subject', entityId: subjectId });
  return { softDeleted: true };
}

/* ─────────────── Batch Schedule (weekly recurring template) ─────────────── */
export interface BatchScheduleItem {
  id: number;
  batchId: number;
  subjectId: number;
  subject: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export async function getBatchSchedule(tenantId: number, batchId: number): Promise<BatchScheduleItem[]> {
  const { rows } = await query<BatchScheduleItem>(
    `SELECT bs.id, bs.batch_id AS "batchId", bs.subject_id AS "subjectId", sub.name AS subject,
            bs.day_of_week AS "dayOfWeek", bs.start_time AS "startTime", bs.end_time AS "endTime"
       FROM batch_schedule bs
       JOIN subjects sub ON sub.id = bs.subject_id
      WHERE bs.tenant_id = $1 AND bs.batch_id = $2
      ORDER BY bs.day_of_week, bs.start_time`,
    [tenantId, batchId]
  );
  return rows;
}

export interface SetBatchScheduleEntry {
  subjectId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/**
 * Two schedule slots (each given as {dayOfWeek, startTime, endTime}) overlap
 * if they fall on the same day and their time ranges intersect. Shared here
 * so setBatchSchedule and assignTeacherToBatch use identical clash logic.
 */
function slotsOverlap(
  a: { dayOfWeek: number; startTime: string; endTime: string },
  b: { dayOfWeek: number; startTime: string; endTime: string }
): boolean {
  return a.dayOfWeek === b.dayOfWeek && a.startTime < b.endTime && b.startTime < a.endTime;
}

/**
 * Fully replaces a batch's weekly schedule template. Since a batch's
 * schedule is one cohesive timetable (not a list of independent rows to
 * add one at a time), edits are all-or-nothing: the existing set is wiped
 * and the new set inserted in the same transaction. Before committing, every
 * teacher already assigned to this batch is re-checked against the NEW
 * schedule for clashes with their OTHER assignments — otherwise editing a
 * batch's schedule after teachers are already assigned could silently
 * create a double-booking with no validation at all.
 */
export async function setBatchSchedule(
  tenantId: number,
  batchId: number,
  entries: SetBatchScheduleEntry[]
): Promise<BatchScheduleItem[]> {
  return withTransaction(async (client) => {
    const batchRow = await client.query<{ subjectIds: number[] }>(
      `SELECT subject_ids AS "subjectIds" FROM batches WHERE id=$1 AND tenant_id=$2 AND is_active = true`,
      [batchId, tenantId]
    );
    if (!batchRow.rowCount) throw ApiError.notFound('BATCH_NOT_FOUND');
    const batchSubjectIds = new Set(batchRow.rows[0].subjectIds);

    for (const e of entries) {
      if (!batchSubjectIds.has(e.subjectId)) {
        throw ApiError.badRequest('INVALID_SUBJECT', 'Subject is not part of this batch');
      }
    }

    // A batch itself can't have two subjects scheduled at an overlapping
    // day/time — students would be double-booked, and (since attendance is
    // keyed per subject, see migration 0034) nothing else would catch this.
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        if (slotsOverlap(entries[i], entries[j])) {
          throw ApiError.conflict(
            'SCHEDULE_CLASH',
            `Two entries overlap on day ${entries[i].dayOfWeek} (${entries[i].startTime}-${entries[i].endTime} and ${entries[j].startTime}-${entries[j].endTime})`
          );
        }
      }
    }

    // Re-check clashes for every teacher already assigned to this batch,
    // against the schedule as it WOULD be after this edit.
    const assigned = await client.query<{ teacherUserId: number; subjectId: number }>(
      `SELECT teacher_user_id AS "teacherUserId", subject_id AS "subjectId"
         FROM teacher_assignments WHERE tenant_id=$1 AND batch_id=$2`,
      [tenantId, batchId]
    );
    if (assigned.rowCount) {
      for (const a of assigned.rows) {
        const newSlotsForThisAssignment = entries.filter((e) => e.subjectId === a.subjectId);
        if (!newSlotsForThisAssignment.length) continue;

        const otherAssignments = await client.query<{
          batchId: number;
          subjectId: number;
          dayOfWeek: number;
          startTime: string;
          endTime: string;
          batchName: string;
        }>(
          `SELECT ta.batch_id AS "batchId", ta.subject_id AS "subjectId",
                  bs.day_of_week AS "dayOfWeek", bs.start_time AS "startTime", bs.end_time AS "endTime",
                  b.name AS "batchName"
             FROM teacher_assignments ta
             JOIN batch_schedule bs ON bs.batch_id = ta.batch_id AND bs.subject_id = ta.subject_id
             JOIN batches b ON b.id = ta.batch_id
            WHERE ta.tenant_id=$1 AND ta.teacher_user_id=$2 AND ta.batch_id != $3`,
          [tenantId, a.teacherUserId, batchId]
        );

        for (const newSlot of newSlotsForThisAssignment) {
          const clash = otherAssignments.rows.find((o) => slotsOverlap(newSlot, o));
          if (clash) {
            throw ApiError.conflict(
              'TEACHER_SCHEDULE_CLASH',
              `This schedule change clashes with an existing assignment in "${clash.batchName}" on ${DAY_NAMES[clash.dayOfWeek]} ${clash.startTime}-${clash.endTime}`
            );
          }
        }
      }
    }

    await client.query(`DELETE FROM batch_schedule WHERE tenant_id=$1 AND batch_id=$2`, [tenantId, batchId]);
    for (const e of entries) {
      await client.query(
        `INSERT INTO batch_schedule (tenant_id, batch_id, subject_id, day_of_week, start_time, end_time)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [tenantId, batchId, e.subjectId, e.dayOfWeek, e.startTime, e.endTime]
      );
    }

    return client.query<BatchScheduleItem>(
      `SELECT bs.id, bs.batch_id AS "batchId", bs.subject_id AS "subjectId", sub.name AS subject,
              bs.day_of_week AS "dayOfWeek", bs.start_time AS "startTime", bs.end_time AS "endTime"
         FROM batch_schedule bs
         JOIN subjects sub ON sub.id = bs.subject_id
        WHERE bs.tenant_id = $1 AND bs.batch_id = $2
        ORDER BY bs.day_of_week, bs.start_time`,
      [tenantId, batchId]
    ).then((r) => r.rows);
  });
}

/* ─────────────── Teacher Assignments ─────────────── */
export interface TeacherAssignmentItem {
  id: number;
  teacherUserId: number;
  teacherName: string;
  batchId: number;
  batchName: string;
  subjectId: number;
  subjectName: string;
}

export async function listTeacherAssignments(
  tenantId: number,
  filters: { teacherUserId?: number; batchId?: number }
): Promise<TeacherAssignmentItem[]> {
  const params: unknown[] = [tenantId];
  const where: string[] = [];
  if (filters.teacherUserId) { params.push(filters.teacherUserId); where.push(`ta.teacher_user_id = $${params.length}`); }
  if (filters.batchId) { params.push(filters.batchId); where.push(`ta.batch_id = $${params.length}`); }

  const { rows } = await query<TeacherAssignmentItem>(
    `SELECT ta.id, ta.teacher_user_id AS "teacherUserId", u.full_name AS "teacherName",
            ta.batch_id AS "batchId", b.name AS "batchName",
            ta.subject_id AS "subjectId", sub.name AS "subjectName"
       FROM teacher_assignments ta
       JOIN users u ON u.id = ta.teacher_user_id
       JOIN batches b ON b.id = ta.batch_id
       JOIN subjects sub ON sub.id = ta.subject_id
      WHERE ta.tenant_id = $1 ${where.length ? 'AND ' + where.join(' AND ') : ''}
      ORDER BY u.full_name, b.name`,
    params
  );
  return rows;
}

/**
 * Assigns a teacher to teach a specific subject within a batch. The
 * teacher's schedule for this assignment is derived entirely from the
 * batch's own batch_schedule rows for that subject — nothing is copied.
 * Hard-blocks (rejects, does not just warn) if any of those slots overlap
 * a day/time the teacher is already covering via a different assignment,
 * so a teacher can never end up double-booked.
 */
export async function assignTeacherToBatch(
  tenantId: number,
  actorUserId: number,
  { teacherUserId, batchId, subjectId }: { teacherUserId: number; batchId: number; subjectId: number }
): Promise<TeacherAssignmentItem> {
  return withTransaction(async (client) => {
    const checks = await client.query<{ teacher_ok: number | null; batch_ok: number | null; subject_ok: number | null }>(
      `SELECT
         (SELECT 1 FROM users WHERE id=$2 AND tenant_id=$1 AND role='teacher') AS teacher_ok,
         (SELECT 1 FROM batches WHERE id=$3 AND tenant_id=$1 AND is_active = true) AS batch_ok,
         (SELECT 1 FROM subjects WHERE id=$4 AND tenant_id=$1) AS subject_ok`,
      [tenantId, teacherUserId, batchId, subjectId]
    );
    if (!checks.rows[0].teacher_ok) throw ApiError.badRequest('INVALID_TEACHER');
    if (!checks.rows[0].batch_ok) throw ApiError.badRequest('INVALID_BATCH');
    if (!checks.rows[0].subject_ok) throw ApiError.badRequest('INVALID_SUBJECT');

    const dup = await client.query(
      `SELECT 1 FROM teacher_assignments WHERE tenant_id=$1 AND teacher_user_id=$2 AND batch_id=$3 AND subject_id=$4`,
      [tenantId, teacherUserId, batchId, subjectId]
    );
    if (dup.rowCount) throw ApiError.conflict('ALREADY_ASSIGNED', 'Teacher is already assigned to this batch and subject');

    const newSlots = await client.query<{ dayOfWeek: number; startTime: string; endTime: string }>(
      `SELECT day_of_week AS "dayOfWeek", start_time AS "startTime", end_time AS "endTime"
         FROM batch_schedule WHERE tenant_id=$1 AND batch_id=$2 AND subject_id=$3`,
      [tenantId, batchId, subjectId]
    );

    if (newSlots.rowCount) {
      const otherAssignments = await client.query<{
        dayOfWeek: number; startTime: string; endTime: string; batchName: string;
      }>(
        `SELECT bs.day_of_week AS "dayOfWeek", bs.start_time AS "startTime", bs.end_time AS "endTime", b.name AS "batchName"
           FROM teacher_assignments ta
           JOIN batch_schedule bs ON bs.batch_id = ta.batch_id AND bs.subject_id = ta.subject_id
           JOIN batches b ON b.id = ta.batch_id
          WHERE ta.tenant_id=$1 AND ta.teacher_user_id=$2`,
        [tenantId, teacherUserId]
      );

      for (const newSlot of newSlots.rows) {
        const clash = otherAssignments.rows.find((o) => slotsOverlap(newSlot, o));
        if (clash) {
          throw ApiError.conflict(
            'TEACHER_SCHEDULE_CLASH',
            `Teacher already has a class in "${clash.batchName}" on ${DAY_NAMES[clash.dayOfWeek]} ${clash.startTime}-${clash.endTime}`
          );
        }
      }
    }

    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO teacher_assignments (tenant_id, teacher_user_id, batch_id, subject_id)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [tenantId, teacherUserId, batchId, subjectId]
    );
    const assignmentId = rows[0].id;

    await writeAudit(
      { tenantId, actorUserId, action: 'teacher_assigned', entity: 'teacher_assignment', entityId: assignmentId, meta: { teacherUserId, batchId, subjectId } },
      client
    );

    const { rows: batchRow } = await client.query<{ name: string }>(`SELECT name FROM batches WHERE id=$1`, [batchId]);
    after(() =>
      notificationCenter
        .sendNotification({
          userIds: [teacherUserId],
          tenantId,
          title: 'New class assigned',
          body: `You've been assigned to teach in ${batchRow[0]?.name ?? 'a batch'}.`,
          type: 'schedule_update',
          entityId: assignmentId,
        })
        .catch((err) => logger.error('Schedule-update notify failed', { error: err instanceof Error ? err.message : String(err) }))
    );

    // Read back via the SAME client/transaction — the module-level query()
    // pool would run on a different connection and not see this uncommitted
    // INSERT yet, incorrectly appearing as "not found".
    const { rows: createdRows } = await client.query<TeacherAssignmentItem>(
      `SELECT ta.id, ta.teacher_user_id AS "teacherUserId", u.full_name AS "teacherName",
              ta.batch_id AS "batchId", b.name AS "batchName",
              ta.subject_id AS "subjectId", sub.name AS "subjectName"
         FROM teacher_assignments ta
         JOIN users u ON u.id = ta.teacher_user_id
         JOIN batches b ON b.id = ta.batch_id
         JOIN subjects sub ON sub.id = ta.subject_id
        WHERE ta.id = $1`,
      [assignmentId]
    );
    if (!createdRows[0]) throw ApiError.notFound('ASSIGNMENT_NOT_FOUND');
    return createdRows[0];
  });
}

export async function removeTeacherAssignment(tenantId: number, actorUserId: number, id: number): Promise<void> {
  const { rowCount } = await query(
    `DELETE FROM teacher_assignments WHERE id=$1 AND tenant_id=$2`,
    [id, tenantId]
  );
  if (!rowCount) throw ApiError.notFound('ASSIGNMENT_NOT_FOUND');
  await writeAudit({ tenantId, actorUserId, action: 'teacher_assignment_removed', entity: 'teacher_assignment', entityId: id });
}

/* ─────────────── Fees ─────────────── */
export interface FeeRow {
  studentId: number;
  name: string;
  total: number;
  paid: number;
  pending: number;
  parentName: string | null;
  parentPhone: string | null;
  has_overdue?: boolean;
}

export type FeeStatusFilter = 'pending' | 'paid' | 'overdue';

export async function listFees(tenantId: number, status?: FeeStatusFilter | null): Promise<FeeRow[]> {
  // Per-student totals now come straight from fee_dues (already resolved
  // per-student amounts, override-aware) instead of a batch-shared
  // fee_structures proxy. `pending` is a computed column, so the status
  // filter has to be applied in an outer query rather than the WHERE
  // clause of the aggregation itself.
  const { rows } = await query<FeeRow>(
    `SELECT * FROM (
       SELECT s.id AS "studentId", u.full_name AS name,
              COALESCE(fd.total,0)::int AS total,
              COALESCE(fp.paid,0)::int AS paid,
              GREATEST(0, COALESCE(fd.total,0) - COALESCE(fp.paid,0))::int AS pending,
              s.parent_name AS "parentName", s.parent_phone AS "parentPhone",
              (
                SELECT bool_or(f.due_date < CURRENT_DATE)
                FROM fee_dues f
                WHERE f.student_id = s.id AND f.tenant_id = $1
              ) AS has_overdue
         FROM students s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN (
           SELECT student_id, sum(amount) AS total
             FROM fee_dues WHERE tenant_id = $1 GROUP BY student_id
         ) fd ON fd.student_id = s.id
         LEFT JOIN (
           SELECT student_id, sum(amount_paid) AS paid
             FROM fee_payments WHERE tenant_id = $1 GROUP BY student_id
         ) fp ON fp.student_id = s.id
        WHERE s.tenant_id = $1
     ) fees
     WHERE $2::text IS NULL
        OR ($2 = 'pending' AND pending > 0)
        OR ($2 = 'paid' AND pending <= 0)
        OR ($2 = 'overdue' AND pending > 0 AND has_overdue = true)
     ORDER BY pending DESC, name`,
    [tenantId, status ?? null]
  );
  return rows;
}

export async function getFeeAnalytics(tenantId: number) {
  // 1. Total Collected (current month)
  // 2. Today's collection
  const { rows: payRows } = await query(
    `SELECT
       SUM(CASE WHEN date_trunc('month', paid_on) = date_trunc('month', CURRENT_DATE) THEN amount_paid ELSE 0 END) AS collected_this_month,
       SUM(CASE WHEN date_trunc('month', paid_on) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month') THEN amount_paid ELSE 0 END) AS collected_last_month,
       SUM(CASE WHEN DATE(paid_on) = CURRENT_DATE THEN amount_paid ELSE 0 END) AS collected_today,
       COUNT(CASE WHEN DATE(paid_on) = CURRENT_DATE THEN 1 END) AS payments_today
     FROM fee_payments
     WHERE tenant_id = $1`,
    [tenantId]
  );

  const collectedThisMonth = Number(payRows[0]?.collected_this_month) || 0;
  const collectedLastMonth = Number(payRows[0]?.collected_last_month) || 0;
  const collectedToday = Number(payRows[0]?.collected_today) || 0;
  const paymentsToday = Number(payRows[0]?.payments_today) || 0;

  let collectedGrowth = 0;
  if (collectedLastMonth > 0) {
    collectedGrowth = ((collectedThisMonth - collectedLastMonth) / collectedLastMonth) * 100;
  } else if (collectedThisMonth > 0) {
    collectedGrowth = 100;
  }

  // 3. Pending & Overdue
  const feesList = await listFees(tenantId);
  let totalPendingAmount = 0;
  let totalPendingStudents = 0;
  let overdueAmount = 0;
  let overdueStudents = 0;

  for (const f of feesList as any) {
    if (f.pending > 0) {
      totalPendingAmount += f.pending;
      totalPendingStudents++;
      if (f.has_overdue) {
        overdueAmount += f.pending; // simple approximation for now
        overdueStudents++;
      }
    }
  }

  return {
    totalCollected: collectedThisMonth,
    totalCollectedGrowth: Math.round(collectedGrowth),
    totalPending: totalPendingAmount,
    pendingStudents: totalPendingStudents,
    overdue: overdueAmount,
    overdueStudents: overdueStudents,
    todayCollection: collectedToday,
    todayPaymentsCount: paymentsToday,
  };
}

export interface RecordPaymentInput {
  studentId: number;
  feeDueId?: number;
  amountPaid: number;
  method?: 'cash' | 'upi' | 'card' | 'online' | string;
}

/** Postgres unique-violation error code. */
const PG_UNIQUE_VIOLATION = '23505';

export async function recordPayment(
  tenantId: number,
  actorUserId: number,
  { studentId, feeDueId, amountPaid, method }: RecordPaymentInput
) {
  const s = await query<{ user_id: number }>(`SELECT user_id FROM students WHERE id=$1 AND tenant_id=$2`, [
    studentId,
    tenantId,
  ]);
  if (!s.rowCount) throw ApiError.badRequest('INVALID_STUDENT');

  // receipt_no is UNIQUE; the generator includes a short random suffix, so on
  // the rare collision we just regenerate and retry rather than losing the payment.
  const MAX_ATTEMPTS = 5;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const receiptNo = generateReceiptNo(tenantId);
    try {
      const rows = await withTransaction(async (client) => {
        if (feeDueId != null) {
          // Lock the due row for the duration of this transaction so two
          // concurrent payments against the same due can't both read a
          // stale "pending" balance and both insert — the second one
          // re-reads the up-to-date paid total once the first commits.
          const due = await client.query<{ amount: number; paid: number }>(
            `SELECT fd.amount,
                    COALESCE((SELECT SUM(fp.amount_paid) FROM fee_payments fp WHERE fp.fee_due_id = fd.id), 0) AS paid
               FROM fee_dues fd
              WHERE fd.id = $1 AND fd.tenant_id = $2 AND fd.student_id = $3
              FOR UPDATE`,
            [feeDueId, tenantId, studentId]
          );
          if (!due.rowCount) throw ApiError.badRequest('INVALID_FEE_DUE', 'Fee due not found for this student');

          const remaining = due.rows[0].amount - Number(due.rows[0].paid);
          if (amountPaid > remaining) {
            throw ApiError.badRequest(
              'AMOUNT_EXCEEDS_DUE',
              `Amount (₹${amountPaid}) exceeds the remaining balance (₹${remaining}) on this fee due`
            );
          }
        }

        const { rows } = await client.query(
          `INSERT INTO fee_payments (tenant_id, student_id, fee_due_id, amount_paid, method, receipt_no)
           VALUES ($1,$2,$3,$4,$5,$6)
           RETURNING id, amount_paid AS "amountPaid", method, receipt_no AS "receiptNo", paid_on AS "paidOn"`,
          [tenantId, studentId, feeDueId || null, amountPaid, method || 'cash', receiptNo]
        );
        return rows;
      });

      await writeAudit({
        tenantId,
        actorUserId,
        action: 'fee_payment_recorded',
        entity: 'fee_payment',
        entityId: rows[0].id,
        meta: { studentId, amountPaid, method: method || 'cash', receiptNo },
      });

      after(() => {
        notificationCenter
          .sendNotification({
            userIds: [s.rows[0].user_id],
            tenantId,
            title: 'Payment received',
            body: `₹${amountPaid} received (receipt ${receiptNo}). Thank you!`,
            type: 'fee_paid',
            entityId: rows[0].id,
          })
          .catch((err) => logger.error('Fee-paid notify failed', { error: err instanceof Error ? err.message : String(err) }));

        // Send official email receipt to student (if email is registered)
        query<{ email: string | null; fullName: string; instituteName: string }>(
          `SELECT u.email, u.full_name AS "fullName", t.name AS "instituteName"
             FROM students s
             JOIN users u ON u.id = s.user_id
             JOIN tenants t ON t.id = s.tenant_id
            WHERE s.id = $1 AND s.tenant_id = $2`,
          [studentId, tenantId]
        )
          .then(({ rows: userRows }) => {
            const studentInfo = userRows[0];
            if (studentInfo?.email) {
              sendPaymentReceiptEmail({
                to: studentInfo.email,
                studentName: studentInfo.fullName,
                instituteName: studentInfo.instituteName,
                receiptNo,
                amount: amountPaid,
                paidOn: rows[0].paidOn || new Date(),
                method: method || 'online',
              }).catch((err) =>
                logger.error('Fee receipt email failed', {
                  error: err instanceof Error ? err.message : String(err),
                })
              );
            }
          })
          .catch((err) =>
            logger.error('Failed to lookup student email for receipt', {
              error: err instanceof Error ? err.message : String(err),
            })
          );
      });

      return { payment: rows[0], receiptNo };
    } catch (err) {
      const code = (err as { code?: string }).code;
      const isLastAttempt = attempt === MAX_ATTEMPTS;
      if (code !== PG_UNIQUE_VIOLATION || isLastAttempt) throw err;
      // else: receipt_no collision — loop and try a freshly generated one.
    }
  }
  // Unreachable, but keeps TypeScript's control-flow analysis happy.
  throw ApiError.conflict('RECEIPT_GENERATION_FAILED', 'Could not generate a unique receipt number');
}

/** Build a free wa.me reminder link (no paid API) for a student's pending fees. */
export async function feeReminderLink(
  tenantId: number,
  studentId: number
): Promise<{ waUrl: string; pending: number }> {
  const { rows } = await query<{
    studentName: string;
    parentName: string | null;
    parentPhone: string;
    instituteName: string;
    pending: number;
  }>(
    `SELECT u.full_name AS "studentName", s.parent_name AS "parentName", s.parent_phone AS "parentPhone",
            t.name AS "instituteName",
            GREATEST(0, COALESCE(fd.total,0) - COALESCE(fp.paid,0))::int AS pending
       FROM students s
       JOIN users u ON u.id = s.user_id
       JOIN tenants t ON t.id = s.tenant_id
       LEFT JOIN (
         SELECT student_id, sum(amount) AS total
           FROM fee_dues WHERE tenant_id=$1 GROUP BY student_id
       ) fd ON fd.student_id = s.id
       LEFT JOIN (
         SELECT student_id, sum(amount_paid) AS paid FROM fee_payments WHERE tenant_id=$1 GROUP BY student_id
       ) fp ON fp.student_id = s.id
      WHERE s.id=$2 AND s.tenant_id=$1`,
    [tenantId, studentId]
  );
  if (!rows[0]) throw ApiError.notFound('STUDENT_NOT_FOUND');
  const r = rows[0];
  const msg = feeReminderMessage({
    parentName: r.parentName,
    studentName: r.studentName,
    feeTitle: 'total',
    pending: r.pending,
    instituteName: r.instituteName,
  });
  return { waUrl: buildWaUrl(r.parentPhone, msg), pending: r.pending };
}

/* ─────────────── Reports ─────────────── */
export interface PerformanceReport {
  avgAttendance: string | null;
  avgMarksPct: string | null;
  totalTests: number;
  totalClasses: number;
  topPerformers: any[];
  needingAttention: any[];
}

export async function performanceReport(
  tenantId: number,
  batchId: number | null
): Promise<PerformanceReport> {
  const params: unknown[] = [tenantId];
  let attWhere = '';
  let resWhere = '';
  let beWhere = '';
  if (batchId) {
    params.push(batchId);
    attWhere = `AND a.batch_id = $2`;
    resWhere = `AND t.batch_id = $2`;
    beWhere = `AND be.batch_id = $2`;
  }

  // Aggregate metrics
  const { rows: stats } = await query(
    `SELECT
       (SELECT ROUND(100.0 * count(*) FILTER (WHERE a.status='present') / NULLIF(count(*),0), 1)
          FROM attendance a WHERE a.tenant_id=$1 ${attWhere}) AS "avgAttendance",
       (SELECT ROUND(AVG(100.0 * tr.marks_obtained / NULLIF(t.max_marks,0)), 1)
          FROM test_results tr JOIN tests t ON t.id=tr.test_id
         WHERE tr.tenant_id=$1 ${resWhere}) AS "avgMarksPct",
       (SELECT count(*)::int FROM tests t WHERE t.tenant_id=$1 ${resWhere}) AS "totalTests",
       (SELECT count(DISTINCT date)::int FROM attendance a WHERE a.tenant_id=$1 ${attWhere}) AS "totalClasses"
    `,
    params
  );

  // Student metrics
  const { rows: students } = await query(
    `SELECT
       s.id, u.full_name as "fullName", s.grade, s.roll_no as "rollNo", b.name as "batchName",
       (SELECT ROUND(100.0 * count(*) FILTER (WHERE a.status='present') / NULLIF(count(*),0), 1)
        FROM attendance a WHERE a.student_id = s.id AND a.tenant_id=$1 ${attWhere}) as "avgAttendance",
       (SELECT ROUND(AVG(100.0 * tr.marks_obtained / NULLIF(t2.max_marks,0)), 1)
        FROM test_results tr JOIN tests t2 ON t2.id=tr.test_id
        WHERE tr.student_id = s.id AND tr.tenant_id=$1 ${resWhere.replace(/t\./g, 't2.')}) as "avgMarksPct"
     FROM students s
     JOIN users u ON u.id = s.user_id
     JOIN batch_enrollments be ON be.student_id = s.id
     JOIN batches b ON b.id = be.batch_id
     WHERE s.tenant_id = $1 ${beWhere}
    `,
    params
  );

  const parsedStudents = students.map(st => ({
    ...st,
    avgAttendance: st.avgAttendance ? Number(st.avgAttendance) : null,
    avgMarksPct: st.avgMarksPct ? Number(st.avgMarksPct) : null,
  }));

  const topPerformers = parsedStudents
    .filter(st => st.avgMarksPct !== null)
    .sort((a, b) => b.avgMarksPct! - a.avgMarksPct!)
    .slice(0, 20);

  const needingAttention = parsedStudents
    .filter(st => {
      const lowAtt = st.avgAttendance !== null && st.avgAttendance < 75;
      const lowMarks = st.avgMarksPct !== null && st.avgMarksPct < 60;
      return lowAtt || lowMarks;
    })
    .sort((a, b) => {
      const aScore = (a.avgMarksPct ?? 100) + (a.avgAttendance ?? 100);
      const bScore = (b.avgMarksPct ?? 100) + (b.avgAttendance ?? 100);
      return aScore - bScore; // Lowest first
    })
    .slice(0, 20); // Limit to 20 for View All UI

  return {
    avgAttendance: stats[0].avgAttendance,
    avgMarksPct: stats[0].avgMarksPct,
    totalTests: stats[0].totalTests,
    totalClasses: stats[0].totalClasses,
    topPerformers,
    needingAttention,
  };
}
