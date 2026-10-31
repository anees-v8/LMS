import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/utils/apiResponse';
import { query, withTransaction } from '@/lib/db';
import ApiError from '@/lib/utils/ApiError';
import { istDateString } from '@/lib/utils/istDate';

export interface AbsenteeItem {
  studentId: number;
  fullName: string;
  rollNo: string | null;
  batchId: number;
  batchName: string;
  parentPhone: string | null;
  phone: string | null;
  waUrl: string;
}

export interface BatchAttendanceSummary {
  batchId: number;
  batchName: string;
  grade: string | null;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  isMarked: boolean;
  markedByTeacher: string | null;
  attendanceRate: number;
}

export interface DefaulterStudent {
  studentId: number;
  fullName: string;
  rollNo: string | null;
  batchName: string;
  parentPhone: string | null;
  attendanceRate: number;
  totalClasses: number;
  attendedClasses: number;
}

// GET /api/admin/attendance
// Optional query params: ?date=YYYY-MM-DD or ?date=YYYY-MM-DD&batchId=123
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const tenantId = requireTenantId(user);
    const { searchParams } = new URL(req.url);

    const date = searchParams.get('date') || istDateString();
    const batchIdParam = searchParams.get('batchId');

    // Fetch institute name for notifications
    const { rows: tenantRows } = await query<{ name: string }>(
      `SELECT name FROM tenants WHERE id = $1`,
      [tenantId]
    );
    const instituteName = tenantRows[0]?.name || 'the Institute';

    // ─────────────────────────────────────────────────────────────
    // CASE 1: SPECIFIC BATCH REGISTER VIEW & CORRECTION
    // ─────────────────────────────────────────────────────────────
    if (batchIdParam) {
      const batchId = Number(batchIdParam);
      if (!batchId) throw ApiError.badRequest('INVALID_BATCH_ID', 'Invalid batch ID');

      const { rows: batchRows } = await query<{ name: string; grade: string | null }>(
        `SELECT name, grade FROM batches WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
        [batchId, tenantId]
      );
      if (!batchRows[0]) throw ApiError.notFound('BATCH_NOT_FOUND', 'Batch not found');

      const { rows: studentRecords } = await query<{
        studentId: number;
        fullName: string;
        rollNo: string | null;
        phone: string | null;
        parentPhone: string | null;
        status: 'present' | 'absent' | 'late' | null;
        markedByName: string | null;
      }>(
        `SELECT s.id AS "studentId",
                stu_user.full_name AS "fullName",
                s.roll_no AS "rollNo",
                stu_user.phone AS "phone",
                s.parent_phone AS "parentPhone",
                a.status,
                marker.full_name AS "markedByName"
           FROM batch_enrollments be
           JOIN students s ON s.id = be.student_id
           JOIN users stu_user ON stu_user.id = s.user_id
           LEFT JOIN attendance a
                  ON a.student_id = s.id
                 AND a.batch_id = be.batch_id
                 AND a.date = $3::date
                 AND a.tenant_id = $2
           LEFT JOIN users marker ON marker.id = a.marked_by
          WHERE be.batch_id = $1
            AND s.tenant_id = $2
            AND stu_user.is_active = true
          ORDER BY s.roll_no ASC NULLS LAST, stu_user.full_name ASC`,
        [batchId, tenantId, date]
      );

      let present = 0;
      let absent = 0;
      let late = 0;
      let unmarked = 0;
      const batchAbsentees: AbsenteeItem[] = [];

      for (const r of studentRecords) {
        if (r.status === 'present') present++;
        else if (r.status === 'absent') {
          absent++;
          const pPhone = (r.parentPhone || r.phone || '').replace(/\D/g, '');
          const cleanPhone = pPhone.length === 10 ? `91${pPhone}` : pPhone;
          const msg = encodeURIComponent(
            `Dear Parent,\nThis is to notify you that your ward *${r.fullName}* was marked *ABSENT* for ${batchRows[0].name} class today (${date}) at *${instituteName}*.\n\nPlease contact the office if this was unexpected.`
          );
          batchAbsentees.push({
            studentId: r.studentId,
            fullName: r.fullName,
            rollNo: r.rollNo,
            batchId,
            batchName: batchRows[0].name,
            parentPhone: r.parentPhone || r.phone,
            phone: r.phone,
            waUrl: cleanPhone ? `https://wa.me/${cleanPhone}?text=${msg}` : '',
          });
        } else if (r.status === 'late') late++;
        else unmarked++;
      }

      return NextResponse.json({
        batchId,
        batchName: batchRows[0].name,
        grade: batchRows[0].grade,
        date,
        summary: {
          total: studentRecords.length,
          present,
          absent,
          late,
          unmarked,
          attendanceRate:
            studentRecords.length > 0 ? Math.round((present / studentRecords.length) * 100) : 0,
        },
        records: studentRecords,
        absentees: batchAbsentees,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // CASE 2: INSTITUTE-WIDE DAILY MONITOR & ABSENTEE OVERVIEW
    // ─────────────────────────────────────────────────────────────

    // A. Batch-wise summary for today
    const { rows: batchSummaryRows } = await query<{
      batchId: number;
      batchName: string;
      grade: string | null;
      totalStudents: number;
      presentCount: number;
      absentCount: number;
      lateCount: number;
      markedCount: number;
      markedByTeacher: string | null;
    }>(
      `SELECT b.id AS "batchId",
              b.name AS "batchName",
              b.grade,
              (SELECT count(*)::int FROM batch_enrollments be JOIN students st ON st.id = be.student_id JOIN users u ON u.id = st.user_id WHERE be.batch_id = b.id AND u.is_active = true) AS "totalStudents",
              count(CASE WHEN a.status = 'present' THEN 1 END)::int AS "presentCount",
              count(CASE WHEN a.status = 'absent' THEN 1 END)::int AS "absentCount",
              count(CASE WHEN a.status = 'late' THEN 1 END)::int AS "lateCount",
              count(a.id)::int AS "markedCount",
              max(u.full_name) AS "markedByTeacher"
         FROM batches b
         LEFT JOIN attendance a
                ON a.batch_id = b.id
               AND a.tenant_id = b.tenant_id
               AND a.date = $2::date
         LEFT JOIN users u ON u.id = a.marked_by
        WHERE b.tenant_id = $1
          AND b.is_active = true
        GROUP BY b.id, b.name, b.grade
        ORDER BY b.name ASC`,
      [tenantId, date]
    );

    const batchSummaries: BatchAttendanceSummary[] = batchSummaryRows.map((b) => ({
      batchId: b.batchId,
      batchName: b.batchName,
      grade: b.grade,
      totalStudents: b.totalStudents,
      presentCount: b.presentCount,
      absentCount: b.absentCount,
      lateCount: b.lateCount,
      isMarked: b.markedCount > 0,
      markedByTeacher: b.markedByTeacher,
      attendanceRate: b.totalStudents > 0 ? Math.round((b.presentCount / b.totalStudents) * 100) : 0,
    }));

    // B. Institute-wide Absentees today with WhatsApp reminder URLs
    const { rows: absenteeRows } = await query<{
      studentId: number;
      fullName: string;
      rollNo: string | null;
      batchId: number;
      batchName: string;
      parentPhone: string | null;
      phone: string | null;
    }>(
      `SELECT s.id AS "studentId",
              stu_user.full_name AS "fullName",
              s.roll_no AS "rollNo",
              b.id AS "batchId",
              b.name AS "batchName",
              s.parent_phone AS "parentPhone",
              stu_user.phone AS "phone"
         FROM attendance a
         JOIN students s ON s.id = a.student_id
         JOIN users stu_user ON stu_user.id = s.user_id
         JOIN batches b ON b.id = a.batch_id
        WHERE a.tenant_id = $1
          AND a.date = $2::date
          AND a.status = 'absent'
          AND stu_user.is_active = true
        ORDER BY b.name ASC, s.roll_no ASC NULLS LAST, stu_user.full_name ASC`,
      [tenantId, date]
    );

    const absentees: AbsenteeItem[] = absenteeRows.map((r) => {
      const pPhone = (r.parentPhone || r.phone || '').replace(/\D/g, '');
      const cleanPhone = pPhone.length === 10 ? `91${pPhone}` : pPhone;
      const msg = encodeURIComponent(
        `Dear Parent,\nThis is to notify you that your ward *${r.fullName}* was marked *ABSENT* for ${r.batchName} class today (${date}) at *${instituteName}*.\n\nPlease contact the office if this was unexpected.`
      );
      return {
        studentId: r.studentId,
        fullName: r.fullName,
        rollNo: r.rollNo,
        batchId: r.batchId,
        batchName: r.batchName,
        parentPhone: r.parentPhone || r.phone,
        phone: r.phone,
        waUrl: cleanPhone ? `https://wa.me/${cleanPhone}?text=${msg}` : '',
      };
    });

    // C. Attendance Defaulters (<75% attendance overall)
    const { rows: defaulterRows } = await query<DefaulterStudent>(
      `SELECT s.id AS "studentId",
              stu_user.full_name AS "fullName",
              s.roll_no AS "rollNo",
              COALESCE(b.name, 'Unassigned') AS "batchName",
              s.parent_phone AS "parentPhone",
              count(a.id)::int AS "totalClasses",
              count(CASE WHEN a.status = 'present' THEN 1 END)::int AS "attendedClasses",
              ROUND(count(CASE WHEN a.status = 'present' THEN 1 END)::numeric / NULLIF(count(a.id), 0) * 100)::int AS "attendanceRate"
         FROM students s
         JOIN users stu_user ON stu_user.id = s.user_id
         LEFT JOIN batch_enrollments be ON be.student_id = s.id
         LEFT JOIN batches b ON b.id = be.batch_id
         JOIN attendance a ON a.student_id = s.id AND a.tenant_id = s.tenant_id
        WHERE s.tenant_id = $1
          AND stu_user.is_active = true
        GROUP BY s.id, stu_user.full_name, s.roll_no, b.name, s.parent_phone
       HAVING count(a.id) >= 5 AND (ROUND(count(CASE WHEN a.status = 'present' THEN 1 END)::numeric / NULLIF(count(a.id), 0) * 100)) < 75
        ORDER BY "attendanceRate" ASC
        LIMIT 20`,
      [tenantId]
    );

    // D. Global metrics for the institute on this date
    let totalInstituteStudents = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;

    batchSummaries.forEach((b) => {
      totalInstituteStudents += b.totalStudents;
      totalPresent += b.presentCount;
      totalAbsent += b.absentCount;
      totalLate += b.lateCount;
    });

    return NextResponse.json({
      date,
      overallSummary: {
        totalStudents: totalInstituteStudents,
        present: totalPresent,
        absent: totalAbsent,
        late: totalLate,
        unmarked: Math.max(0, totalInstituteStudents - (totalPresent + totalAbsent + totalLate)),
        overallAttendanceRate:
          totalInstituteStudents > 0 ? Math.round((totalPresent / totalInstituteStudents) * 100) : 0,
        batchesMarkedCount: batchSummaries.filter((b) => b.isMarked).length,
        batchesTotalCount: batchSummaries.length,
      },
      batchSummaries,
      absentees,
      defaulters: defaulterRows,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/admin/attendance — Admin correction & manual override
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const tenantId = requireTenantId(user);
    const body = await req.json();

    const { batchId, date, records } = body;
    if (!batchId || !date || !Array.isArray(records)) {
      throw ApiError.badRequest('INVALID_PAYLOAD', 'batchId, date, and records array are required');
    }

    let subjectId = body.subjectId ? Number(body.subjectId) : null;
    if (!subjectId) {
      const { rows: bRows } = await query<{ subject_ids: number[] }>(
        `SELECT subject_ids FROM batches WHERE id = $1 AND tenant_id = $2`,
        [batchId, tenantId]
      );
      if (bRows[0]?.subject_ids?.[0]) {
        subjectId = bRows[0].subject_ids[0];
      }
    }
    if (!subjectId) {
      const { rows: subRows } = await query<{ id: number }>(
        `SELECT id FROM subjects WHERE tenant_id = $1 ORDER BY id ASC LIMIT 1`,
        [tenantId]
      );
      if (subRows[0]?.id) {
        subjectId = subRows[0].id;
      }
    }

    await withTransaction(async (client) => {
      for (const rec of records) {
        if (!rec.studentId || !rec.status) continue;
        await client.query(
          `INSERT INTO attendance (tenant_id, batch_id, subject_id, student_id, date, status, marked_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (student_id, date, batch_id, subject_id)
           DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`,
          [tenantId, batchId, subjectId, rec.studentId, date, rec.status, user.userId]
        );
      }
    });

    return NextResponse.json({ success: true, savedCount: records.length });
  } catch (err) {
    return handleApiError(err);
  }
}
