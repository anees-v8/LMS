import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/teacher.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { validateBody } from '@/lib/middleware/validate';
import { batchIdParamSchema } from '@/lib/validators/teacher.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

// Subjects this teacher is assigned to teach within this one batch —
// used to pick which (batch, subject) chapter list to manage.
export async function GET(req: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const user = requireAuth(req, 'teacher');
    const { batchId } = validateBody(batchIdParamSchema, await params);
    const result = await svc.listMySubjectsForBatch(requireTenantId(user), user.userId, batchId);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
