import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/teacher.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { validateBody } from '@/lib/middleware/validate';
import { batchIdParamSchema, batchStudentsQuerySchema } from '@/lib/validators/teacher.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

// Ported from Express: router.get('/batches/:batchId/students', validate(batchIdParamSchema, 'params'), validate(batchStudentsQuerySchema, 'query'), ctrl.batchStudents)
export async function GET(req: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const user = requireAuth(req, 'teacher');
    const { batchId } = validateBody(batchIdParamSchema, await params);
    const query = Object.fromEntries(req.nextUrl.searchParams);
    const { date, subjectId } = validateBody(batchStudentsQuerySchema, query);
    const result = await svc.batchStudents(requireTenantId(user), batchId, date, subjectId);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
