import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { generateReceiptNo } from '../utils/receipt.js';
import { writeAudit } from '../utils/audit.js';
import { buildWaUrl, feeReminderMessage, sendPaymentReceipt, sendFeeReminder } from './whatsapp.service.js';
import { canTenantUseWhatsappApi, claimDailyWhatsappDispatch } from './whatsappDispatch.service.js';
import { getTenantDashboard } from './superadmin.service.js';
import * as notificationCenter from './notificationCenter.service.js';
import { sendPaymentReceiptEmail } from './notification.service.js';
import logger from '../utils/logger.js';
import { istDateString } from '../utils/istDate.js';

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

  const userUpdates: string[] = [];
  const userValues: any[] = [id, tenantId];
  let ui = 3;
  if (fullName !== undefined) { userUpdates.push(`full_name=$${ui++}`); userValues.push(fullName); }
  if (phone !== undefined) { userUpdates.push(`phone=$${ui++}`); userValues.push(phone); }
  if (email !== undefined) { userUpdates.push(`email=$${ui++}`); userValues.push(email); }
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

export async function deleteTeacher(tenantId: number, actorUserId: number, id: number): Promise<void> {
  const { rowCount } = await query(
    `DELETE FROM users WHERE id=$1 AND tenant_id=$2 AND role='teacher'`,
    [id, tenantId]
  );
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
             (COALESCE(sd.total_due, 0) - COALESCE(sf.total_paid, 0)) AS "pendingFees",
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
}

export async function createStudent(tenantId: number, actorUserId: number, input: CreateStudentInput) {
  const { fullName, phone, password, parentName, parentPhone, grade, rollNo, batchId } = input;
  const hash = await bcrypt.hash(password, 10);

  return withTransaction(async (client) => {
    // Verify batch belongs to tenant before creating anything.
    const b = await client.query(`SELECT 1 FROM batches WHERE id=$1 AND tenant_id=$2`, [batchId, tenantId]);
    if (!b.rowCount) throw ApiError.badRequest('INVALID_BATCH', 'Batch not found for this tenant');

    const user = (
      await client.query<{ id: number }>(
        `INSERT INTO users (tenant_id, role, full_name, phone, password_hash)
       VALUES ($1,'student',$2,$3,$4) RETURNING id`,
        [tenantId, fullName, phone, hash]
      )
    ).rows[0];

    const student = (
      await client.query<{ id: number; rollNo: string | null; parentPhone: string; grade: string | null }>(
        `INSERT INTO students (tenant_id, user_id, roll_no, parent_name, parent_phone, grade)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, roll_no AS "rollNo", parent_phone AS "parentPhone", grade`,
        [tenantId, user.id, rollNo || null, parentName || null, parentPhone, grade || null]
      )
    ).rows[0];

    await client.query(
      `INSERT INTO batch_enrollments (tenant_id, batch_id, student_id) VALUES ($1,$2,$3)`,
      [tenantId, batchId, student.id]
    );

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

export async function updateStudent(tenantId: number, actorUserId: number, id: number, input: Partial<CreateStudentInput>) {
  const { fullName, phone, password, parentName, parentPhone, grade, rollNo, batchId } = input;

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

    if (parentName !== undefined || parentPhone !== undefined || grade !== undefined || rollNo !== undefined) {
      const updates = [];
      const values = [];
      let idx = 1;
      if (parentName !== undefined) { updates.push(`parent_name=$${idx++}`); values.push(parentName || null); }
      if (parentPhone !== undefined) { updates.push(`parent_phone=$${idx++}`); values.push(parentPhone); }
      if (grade !== undefined) { updates.push(`grade=$${idx++}`); values.push(grade || null); }
      if (rollNo !== undefined) { updates.push(`roll_no=$${idx++}`); values.push(rollNo || null); }
      if (updates.length > 0) {
        values.push(id, tenantId);
        await client.query(`UPDATE students SET ${updates.join(', ')} WHERE id=$${idx++} AND tenant_id=$${idx}`, values);
      }
    }

    if (batchId) {
      const b = await client.query(`SELECT 1 FROM batches WHERE id=$1 AND tenant_id=$2`, [batchId, tenantId]);
      if (!b.rowCount) throw ApiError.badRequest('INVALID_BATCH', 'Batch not found for this tenant');
      
      const be = await client.query(`SELECT 1 FROM batch_enrollments WHERE student_id=$1 AND tenant_id=$2`, [id, tenantId]);
      if (be.rowCount) {
        await client.query(`UPDATE batch_enrollments SET batch_id=$1 WHERE student_id=$2 AND tenant_id=$3`, [batchId, id, tenantId]);
      } else {
        await client.query(`INSERT INTO batch_enrollments (tenant_id, batch_id, student_id) VALUES ($1,$2,$3)`, [tenantId, batchId, id]);
      }
    }

    await writeAudit({ tenantId, actorUserId, action: 'student_updated', entity: 'student', entityId: id }, client);
    return { success: true };
  });
}

export async function deleteStudent(tenantId: number, actorUserId: number, id: number): Promise<void> {
  // Deleting the user cascades to students + enrollments.
  const { rows } = await query<{ user_id: number }>(
    `SELECT user_id FROM students WHERE id=$1 AND tenant_id=$2`,
    [id, tenantId]
  );
  if (!rows[0]) throw ApiError.notFound('STUDENT_NOT_FOUND');
  await query(`DELETE FROM users WHERE id=$1 AND tenant_id=$2`, [rows[0].user_id, tenantId]);
  await writeAudit({ tenantId, actorUserId, action: 'student_deleted', entity: 'student', entityId: id });
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
  const { rows: studentRows } = await query<{ roll_no: string; grade: string; is_active: boolean }>(
    `SELECT s.roll_no, s.grade, u.is_active
     FROM students s
     JOIN users u ON u.id = s.user_id
     WHERE s.id=$1 AND s.tenant_id=$2`,
    [id, tenantId]
  );
  if (!studentRows.length) throw ApiError.notFound('STUDENT_NOT_FOUND');
  const studentBasic = studentRows[0];

  // Academics: Subjects, test marks (use LEFT JOIN so tests without subject_id are not dropped)
  const { rows: testRows } = await query(
    `SELECT
       COALESCE(s.name, 'General') AS "name",
       SUM(tr.marks_obtained)::int AS "marks",
       SUM(t.max_marks)::int AS "total"
     FROM test_results tr
     JOIN tests t ON t.id = tr.test_id
     LEFT JOIN subjects s ON s.id = t.subject_id
     WHERE tr.student_id = $1 AND tr.tenant_id = $2
     GROUP BY COALESCE(s.name, 'General')`,
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

  // Test statistics:
  // 1) Tests attempted by this student
  const { rows: testAttemptedRows } = await query<{ attempted: number }>(
    `SELECT COUNT(DISTINCT tr.test_id)::int AS attempted
     FROM test_results tr
     WHERE tr.student_id = $1 AND tr.tenant_id = $2`,
    [id, tenantId]
  );
  const attemptedCount = Number(testAttemptedRows[0]?.attempted || 0);

  // 2) Tests assigned to student's enrolled batches that are scheduled/due (excluding upcoming future tests)
  const { rows: testCountRows } = await query<{ total: number }>(
    `SELECT COUNT(DISTINCT t.id)::int AS total
     FROM tests t
     JOIN batch_enrollments be ON be.batch_id = t.batch_id AND be.student_id = $1 AND be.tenant_id = $2
     WHERE t.tenant_id = $2
       AND (t.scheduled_at IS NULL OR t.scheduled_at <= NOW())`,
    [id, tenantId]
  );
  const totalEligibleTests = Number(testCountRows[0]?.total || 0);
  const totalTests = Math.max(totalEligibleTests, attemptedCount);

  // 3) Missed tests: Only expired tests assigned to student's batch where deadline passed and student did not attempt
  const { rows: testMissedRows } = await query<{ missed: number }>(
    `SELECT COUNT(DISTINCT t.id)::int AS missed
     FROM tests t
     JOIN batch_enrollments be ON be.batch_id = t.batch_id AND be.student_id = $1 AND be.tenant_id = $2
     WHERE t.tenant_id = $2
       AND (
         (t.valid_until IS NOT NULL AND t.valid_until < NOW())
         OR (t.valid_until IS NULL AND t.scheduled_at IS NOT NULL AND t.scheduled_at + (COALESCE(t.duration_minutes, 60) || ' minutes')::interval < NOW())
       )
       AND t.id NOT IN (
         SELECT tr.test_id FROM test_results tr WHERE tr.student_id = $1 AND tr.tenant_id = $2
       )`,
    [id, tenantId]
  );
  const missedCount = Number(testMissedRows[0]?.missed || 0);

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

  // Fees: Overview & Installments — now per-student (fee_dues)
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
      isActive: studentBasic.is_active,
    },
    academics: {
      overallPercentage: (overallPct * 100).toFixed(1),
      grade: overallGrade,
      totalTests,
      attemptedCount,
      missedCount,
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
      pending: Math.max(0, totalFees - totalPaid),
      total: totalFees,
      paid: totalPaid,
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
        description: f.desc,
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
}

export async function listBatches(tenantId: number): Promise<BatchItem[]> {
  const { rows } = await query<BatchItem>(
    `SELECT b.id, b.name, b.grade, b.subject_ids AS "subjectIds",
            (SELECT count(*)::int FROM batch_enrollments be WHERE be.batch_id=b.id) AS "studentCount",
            COALESCE(
              (SELECT array_agg(s.name ORDER BY s.name) FROM subjects s WHERE s.id = ANY(b.subject_ids)),
              ARRAY[]::text[]
            ) AS "subjectNames"
       FROM batches b WHERE b.tenant_id=$1 ORDER BY b.created_at DESC`,
    [tenantId]
  );
  return rows;
}

export async function createBatch(
  tenantId: number,
  { name, grade, subjectIds }: { name: string; grade?: string; subjectIds?: number[] }
): Promise<BatchItem> {
  const ids = subjectIds ?? [];
  if (ids.length) {
    const owned = await query<{ count: number }>(
      `SELECT count(*)::int AS count FROM subjects WHERE tenant_id=$1 AND id = ANY($2::int[])`,
      [tenantId, ids]
    );
    if (owned.rows[0].count !== ids.length) throw ApiError.badRequest('INVALID_SUBJECT');
  }

  const { rows } = await query<{ id: number; name: string; grade: string | null; subjectIds: number[] }>(
    `INSERT INTO batches (tenant_id, name, grade, subject_ids) VALUES ($1,$2,$3,$4::int[])
     RETURNING id, name, grade, subject_ids AS "subjectIds"`,
    [tenantId, name, grade || null, ids]
  );
  return { ...rows[0], studentCount: 0, subjectNames: [] };
}

/* ─────────────── Subjects ─────────────── */
export interface SubjectItem {
  id: number;
  name: string;
  totalChapters: number;
}

export async function listSubjects(tenantId: number): Promise<SubjectItem[]> {
  const { rows } = await query<SubjectItem>(
    `SELECT id, name, total_chapters AS "totalChapters" FROM subjects WHERE tenant_id=$1 ORDER BY name`,
    [tenantId]
  );
  return rows;
}

export async function createSubject(
  tenantId: number,
  { name, totalChapters }: { name: string; totalChapters?: number }
): Promise<SubjectItem> {
  const { rows } = await query<SubjectItem>(
    `INSERT INTO subjects (tenant_id, name, total_chapters) VALUES ($1,$2,$3)
     RETURNING id, name, total_chapters AS "totalChapters"`,
    [tenantId, name, totalChapters ?? 0]
  );
  return rows[0];
}

export async function updateSubject(
  tenantId: number,
  subjectId: number,
  { name, totalChapters }: { name: string; totalChapters?: number }
): Promise<SubjectItem> {
  const { rows } = await query<SubjectItem>(
    `UPDATE subjects SET name = $1, total_chapters = COALESCE($2, total_chapters)
      WHERE id = $3 AND tenant_id = $4
      RETURNING id, name, total_chapters AS "totalChapters"`,
    [name, totalChapters ?? null, subjectId, tenantId]
  );
  if (rows.length === 0) throw new Error('Subject not found or unauthorized');
  return rows[0];
}

export async function deleteSubject(tenantId: number, subjectId: number): Promise<void> {
  const { rowCount } = await query(
    `DELETE FROM subjects WHERE id = $1 AND tenant_id = $2`,
    [subjectId, tenantId]
  );
  if (rowCount === 0) throw new Error('Subject not found or unauthorized');
}

/* ─────────────── Timetable (teacher allocation) ─────────────── */
export interface TimetableItem {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  batch: string;
  subject: string | null;
  teacher: string;
  batchId: number;
  teacherId: number;
  subjectId: number | null;
}

export async function listTimetable(
  tenantId: number,
  day?: string | number | null
): Promise<TimetableItem[]> {
  const params: unknown[] = [tenantId];
  let where = '';
  if (day !== undefined && day !== null && day !== '') {
    params.push(Number(day));
    where = `AND tt.day_of_week = $2`;
  }
  const { rows } = await query<TimetableItem>(
    `SELECT tt.id, tt.day_of_week AS "dayOfWeek", tt.start_time AS "startTime",
            tt.end_time AS "endTime",
            b.name AS batch, sub.name AS subject, u.full_name AS teacher,
            tt.batch_id AS "batchId", tt.teacher_id AS "teacherId", tt.subject_id AS "subjectId"
       FROM timetable tt
       JOIN batches b ON b.id = tt.batch_id
       LEFT JOIN subjects sub ON sub.id = tt.subject_id
       JOIN users u ON u.id = tt.teacher_id
      WHERE tt.tenant_id = $1 ${where}
      ORDER BY tt.day_of_week, tt.start_time`,
    params
  );
  return rows;
}

export interface CreateTimetableInput {
  batchId: number;
  subjectId?: number;
  teacherId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export async function createTimetableEntry(tenantId: number, input: CreateTimetableInput) {
  const { batchId, subjectId, teacherId, dayOfWeek, startTime, endTime } = input;
  // Ownership checks
  const checks = await query<{ batch_ok: number | null; teacher_ok: number | null; subject_ok: number | null }>(
    `SELECT
       (SELECT 1 FROM batches WHERE id=$2 AND tenant_id=$1) AS batch_ok,
       (SELECT 1 FROM users WHERE id=$3 AND tenant_id=$1 AND role='teacher') AS teacher_ok,
       (SELECT 1 FROM subjects WHERE id=$4 AND tenant_id=$1) AS subject_ok`,
    [tenantId, batchId, teacherId, subjectId ?? null]
  );
  if (!checks.rows[0].batch_ok) throw ApiError.badRequest('INVALID_BATCH');
  if (!checks.rows[0].teacher_ok) throw ApiError.badRequest('INVALID_TEACHER');
  if (subjectId != null && !checks.rows[0].subject_ok) throw ApiError.badRequest('INVALID_SUBJECT');

  const { rows } = await query(
    `INSERT INTO timetable (tenant_id, batch_id, subject_id, teacher_id, day_of_week, start_time, end_time)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, batch_id AS "batchId", teacher_id AS "teacherId", day_of_week AS "dayOfWeek",
               start_time AS "startTime", end_time AS "endTime"`,
    [tenantId, batchId, subjectId || null, teacherId, dayOfWeek, startTime, endTime]
  );
  const entry = rows[0];

  const { rows: batchRow } = await query<{ name: string }>(`SELECT name FROM batches WHERE id = $1`, [batchId]);
  notificationCenter
    .sendNotification({
      userIds: [teacherId],
      tenantId,
      title: 'New class assigned',
      body: `You've been assigned ${batchRow[0]?.name ?? 'a batch'} — ${DAY_NAMES[dayOfWeek] ?? ''} ${startTime}–${endTime}.`,
      type: 'timetable_update',
      entityId: entry.id,
    })
    .catch((err) => logger.error('Timetable-update notify failed', { error: err instanceof Error ? err.message : String(err) }));

  return entry;
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
  // Per-student totals: sum of applicable fee structures minus payments.
  // `pending` is a computed column, so the status filter has to be applied in
  // an outer query rather than the WHERE clause of the aggregation itself.
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

export interface CreateFeeStructureInput {
  batchId?: number;
  title: string;
  amount: number;
  dueDate?: string;
}

export async function createFeeStructure(
  tenantId: number,
  actorUserId: number,
  { batchId, title, amount, dueDate }: CreateFeeStructureInput
) {
  if (batchId) {
    const b = await query(`SELECT 1 FROM batches WHERE id=$1 AND tenant_id=$2`, [batchId, tenantId]);
    if (!b.rowCount) throw ApiError.badRequest('INVALID_BATCH');
    const { rows: students } = await query<{ student_id: number }>(
      `SELECT student_id FROM batch_enrollments WHERE batch_id = $1`,
      [batchId]
    );
    for (const s of students) {
      await query(
        `INSERT INTO fee_dues (tenant_id, student_id, batch_id, title, amount, due_date, period_index)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), 1)
         ON CONFLICT (student_id, batch_id, period_index) DO NOTHING`,
        [tenantId, s.student_id, batchId, title, amount, dueDate || null]
      );
    }
  }
  return { title, amount, batchId, dueDate };
}

export interface RecordPaymentInput {
  studentId: number;
  feeStructureId?: number;
  feeDueId?: number;
  amountPaid: number;
  method?: 'cash' | 'upi' | 'card';
}

/** Postgres unique-violation error code. */
const PG_UNIQUE_VIOLATION = '23505';

export async function recordPayment(
  tenantId: number,
  actorUserId: number,
  { studentId, feeStructureId, feeDueId, amountPaid, method }: RecordPaymentInput
) {
  const s = await query<{ user_id: number }>(`SELECT user_id FROM students WHERE id=$1 AND tenant_id=$2`, [
    studentId,
    tenantId,
  ]);
  if (!s.rowCount) throw ApiError.badRequest('INVALID_STUDENT');

  const dueId = feeDueId || feeStructureId || null;
  // receipt_no is UNIQUE; the generator includes a short random suffix, so on
  // the rare collision we just regenerate and retry rather than losing the payment.
  const MAX_ATTEMPTS = 5;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const receiptNo = generateReceiptNo(tenantId);
    try {
      const { rows } = await query(
        `INSERT INTO fee_payments (tenant_id, student_id, fee_due_id, amount_paid, method, receipt_no)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id, amount_paid AS "amountPaid", method, receipt_no AS "receiptNo", paid_on AS "paidOn"`,
        [tenantId, studentId, dueId, amountPaid, method || 'cash', receiptNo]
      );
      await writeAudit({
        tenantId,
        actorUserId,
        action: 'fee_payment_recorded',
        entity: 'fee_payment',
        entityId: rows[0].id,
        meta: { studentId, amountPaid, method: method || 'cash', receiptNo },
      });

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

      // Send official email receipt to student & WhatsApp to parent
      query<{ email: string | null; fullName: string; instituteName: string; parentPhone: string | null }>(
        `SELECT u.email, u.full_name AS "fullName", t.name AS "instituteName", s.parent_phone AS "parentPhone"
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
          if (studentInfo?.parentPhone) {
            // Rule 1: Basic Plan OFF. Only Pro/Elite/Trial can use paid automated WhatsApp API.
            canTenantUseWhatsappApi(tenantId).then((canUseApi) => {
              if (canUseApi && studentInfo.parentPhone) {
                sendPaymentReceipt({
                  parentPhone: studentInfo.parentPhone,
                  amount: amountPaid,
                  feeType: 'Tuition Fee',
                  studentName: studentInfo.fullName,
                  instituteName: studentInfo.instituteName,
                  receiptPath: 'student/fees',
                }).catch((err) =>
                  logger.error('Fee receipt WhatsApp failed', {
                    error: err instanceof Error ? err.message : String(err),
                  })
                );
              }
            }).catch((err) =>
              logger.error('Fee receipt WhatsApp entitlement check failed', {
                error: err instanceof Error ? err.message : String(err),
              })
            );
          }
        })
        .catch((err) =>
          logger.error('Failed to lookup student email/phone for receipt', {
            error: err instanceof Error ? err.message : String(err),
          })
        );

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
            (COALESCE(fs.total,0) - COALESCE(fp.paid,0))::int AS pending
       FROM students s
       JOIN users u ON u.id = s.user_id
       JOIN tenants t ON t.id = s.tenant_id
       LEFT JOIN (
         SELECT student_id, sum(amount) AS total
           FROM fee_dues WHERE tenant_id = $1 GROUP BY student_id
       ) fs ON fs.student_id = s.id
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

  // Rule 1: Basic Plan OFF. Only Pro/Elite/Trial can use paid automated WhatsApp API.
  // Rule 2: Max 1 fee reminder per student per day to prevent duplicate API charges.
  const canUseApi = await canTenantUseWhatsappApi(tenantId);
  if (canUseApi && r.parentPhone) {
    const today = istDateString();
    const claimed = await claimDailyWhatsappDispatch(tenantId, studentId, 'fee_reminder', today);
    if (claimed) {
      sendFeeReminder({
        parentPhone: r.parentPhone,
        studentName: r.studentName,
        feeTitle: 'Tuition Fee',
        pending: r.pending,
        instituteName: r.instituteName,
      }).catch((err) =>
        logger.error('Fee reminder WhatsApp failed', {
          error: err instanceof Error ? err.message : String(err),
        })
      );
    }
  }

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

