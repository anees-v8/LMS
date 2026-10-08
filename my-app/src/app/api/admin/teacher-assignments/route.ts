import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/admin.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { requireActiveSubscription } from '@/lib/middleware/subscriptionGuard';
import { validateBody } from '@/lib/middleware/validate';
import { assignTeacherSchema } from '@/lib/validators/admin.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

// Replaces the implicit teacher-batch link that used to only exist via a
// timetable row's teacher_id. Optional ?teacherId=/?batchId= filters.
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('teacherId');
    const batchId = searchParams.get('batchId');
    const result = await svc.listTeacherAssignments(requireTenantId(user), {
      teacherUserId: teacherId ? Number(teacherId) : undefined,
      batchId: batchId ? Number(batchId) : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

// Assigns a teacher to teach a subject within a batch. Hard-blocks (409) on
// a day/time clash with the teacher's other assignments — see
// admin.service.ts's assignTeacherToBatch doc comment.
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const tenantId = requireTenantId(user);
    await requireActiveSubscription(tenantId);
    const body = validateBody(assignTeacherSchema, await req.json());
    const result = await svc.assignTeacherToBatch(tenantId, user.userId, body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
