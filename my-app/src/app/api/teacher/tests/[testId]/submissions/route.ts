import { NextRequest, NextResponse } from 'next/server';
import * as testSvc from '@/lib/services/test.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { validateBody } from '@/lib/middleware/validate';
import { testIdParamSchema } from '@/lib/validators/teacher.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

export async function GET(req: NextRequest, { params }: { params: Promise<{ testId: string }> }) {
  try {
    const user = requireAuth(req, 'teacher', 'coaching_admin');
    const { testId } = validateBody(testIdParamSchema, await params);
    const result = await testSvc.getTestSubmissions(requireTenantId(user), testId);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
