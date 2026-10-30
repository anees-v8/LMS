import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { requireActiveSubscription } from '@/lib/middleware/subscriptionGuard';
import { handleApiError } from '@/lib/utils/apiResponse';
import { query } from '@/lib/db';
import ApiError from '@/lib/utils/ApiError';

export interface TimetableItem {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  batch: string;
  subject?: string;
  teacher: string;
  batchId: number;
  teacherId: number;
  subjectId?: number;
}

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const tenantId = requireTenantId(user);
    const { searchParams } = new URL(req.url);
    const day = searchParams.get('day');

    const params: unknown[] = [tenantId];
    let where = '';
    if (day !== null && day !== undefined && day !== '') {
      params.push(Number(day));
      where = `AND bs.day_of_week = $2`;
    }

    const { rows } = await query<TimetableItem>(
      `SELECT bs.id, bs.day_of_week AS "dayOfWeek", bs.start_time AS "startTime",
              bs.end_time AS "endTime",
              b.name AS batch, sub.name AS subject, COALESCE(u.full_name, 'Unassigned') AS teacher,
              bs.batch_id AS "batchId", COALESCE(ta.teacher_user_id, 0) AS "teacherId", bs.subject_id AS "subjectId"
         FROM batch_schedule bs
         JOIN batches b ON b.id = bs.batch_id
         LEFT JOIN subjects sub ON sub.id = bs.subject_id
         LEFT JOIN teacher_assignments ta ON ta.batch_id = bs.batch_id AND ta.subject_id = bs.subject_id AND ta.tenant_id = bs.tenant_id
         LEFT JOIN users u ON u.id = ta.teacher_user_id
        WHERE bs.tenant_id = $1 ${where}
        ORDER BY bs.day_of_week, bs.start_time`,
      params
    );

    return NextResponse.json(rows);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const tenantId = requireTenantId(user);
    await requireActiveSubscription(tenantId);

    const body = await req.json();
    const { batchId, subjectId, teacherId, dayOfWeek, startTime, endTime } = body;

    const checks = await query<{ batch_ok: number | null; teacher_ok: number | null; subject_ok: number | null }>(
      `SELECT
         (SELECT 1 FROM batches WHERE id=$2 AND tenant_id=$1) AS batch_ok,
         (SELECT 1 FROM users WHERE id=$3 AND tenant_id=$1 AND role='teacher') AS teacher_ok,
         (SELECT 1 FROM subjects WHERE id=$4 AND tenant_id=$1) AS subject_ok`,
      [tenantId, batchId, teacherId, subjectId ?? null]
    );

    if (!checks.rows[0]?.batch_ok) throw ApiError.badRequest('INVALID_BATCH', 'Selected batch does not exist');
    if (teacherId && !checks.rows[0]?.teacher_ok) throw ApiError.badRequest('INVALID_TEACHER', 'Selected teacher does not exist');
    if (subjectId != null && !checks.rows[0]?.subject_ok) throw ApiError.badRequest('INVALID_SUBJECT', 'Selected subject does not exist');

    const { rows } = await query(
      `INSERT INTO batch_schedule (tenant_id, batch_id, subject_id, day_of_week, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, batch_id AS "batchId", day_of_week AS "dayOfWeek",
                 start_time AS "startTime", end_time AS "endTime"`,
      [tenantId, batchId, subjectId || null, dayOfWeek, startTime, endTime]
    );

    if (subjectId && teacherId) {
      await query(
        `INSERT INTO teacher_assignments (tenant_id, teacher_user_id, batch_id, subject_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (teacher_user_id, batch_id, subject_id) DO NOTHING`,
        [tenantId, teacherId, batchId, subjectId]
      );
    }

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

