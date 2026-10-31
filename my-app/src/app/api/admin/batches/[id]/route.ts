import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/admin.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { requireActiveSubscription } from '@/lib/middleware/subscriptionGuard';
import { validateBody } from '@/lib/middleware/validate';
import { updateBatchSchema, idParamSchema } from '@/lib/validators/admin.validators';
import { handleApiError } from '@/lib/utils/apiResponse';
import { query } from '@/lib/db';
import ApiError from '@/lib/utils/ApiError';

// GET: Single batch details with subjects, schedule, teachers & enrolled students
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const tenantId = requireTenantId(user);
    const resolvedParams = await params;
    const batchId = Number(resolvedParams.id);
    if (!batchId || isNaN(batchId)) {
      throw ApiError.badRequest('INVALID_ID', 'Invalid batch ID');
    }

    // 1. Fetch batch info
    const { rows: batchRows } = await query(
      `SELECT b.id, b.name, b.grade, b.subject_ids AS "subjectIds",
              b.fee_amount AS "feeAmount", b.installment_count AS "installmentCount",
              b.start_date AS "startDate", b.end_date AS "endDate",
              (SELECT count(*)::int FROM batch_enrollments be WHERE be.batch_id=b.id) AS "studentCount",
              COALESCE(
                (SELECT jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name) ORDER BY s.name)
                   FROM subjects s WHERE s.id = ANY(b.subject_ids)),
                '[]'::jsonb
              ) AS "subjects"
         FROM batches b
        WHERE b.id = $1 AND b.tenant_id = $2 AND b.is_active = true`,
      [batchId, tenantId]
    );

    if (!batchRows[0]) {
      throw ApiError.notFound('BATCH_NOT_FOUND', 'Batch not found');
    }

    const batch = batchRows[0];

    // 2. Fetch enrolled students with attendance rate
    const { rows: studentRows } = await query(
      `SELECT s.id, s.full_name AS "fullName", s.roll_no AS "rollNo", s.phone, s.parent_phone AS "parentPhone",
              s.email, s.gender, s.created_at AS "createdAt",
              COALESCE(
                (SELECT ROUND(COUNT(CASE WHEN status='present' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100)
                   FROM attendance a WHERE a.student_id = s.id AND a.tenant_id = $2),
                100
              )::int AS "attendanceRate"
         FROM batch_enrollments be
         JOIN students s ON s.id = be.student_id
        WHERE be.batch_id = $1 AND s.tenant_id = $2 AND s.is_active = true
        ORDER BY s.roll_no ASC NULLS LAST, s.full_name ASC`,
      [batchId, tenantId]
    );

    // 3. Fetch weekly schedule
    const schedule = await svc.getBatchSchedule(tenantId, batchId);

    // 4. Fetch teacher assignments
    const teacherAssignments = await svc.listTeacherAssignments(tenantId, { batchId });

    return NextResponse.json({
      ...batch,
      students: studentRows,
      schedule,
      teacherAssignments,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// Edit a batch's name/grade/subjects
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const tenantId = requireTenantId(user);
    await requireActiveSubscription(tenantId);
    const { id } = validateBody(idParamSchema, await params);
    const body = validateBody(updateBatchSchema, await req.json());
    const result = await svc.updateBatch(tenantId, id, user.userId, body);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

// Remove a batch
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const tenantId = requireTenantId(user);
    await requireActiveSubscription(tenantId);
    const { id } = validateBody(idParamSchema, await params);
    const result = await svc.deleteBatch(tenantId, id, user.userId);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
