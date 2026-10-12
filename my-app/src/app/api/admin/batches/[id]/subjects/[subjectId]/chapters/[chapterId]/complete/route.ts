import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/admin.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { requireActiveSubscription } from '@/lib/middleware/subscriptionGuard';
import { validateBody } from '@/lib/middleware/validate';
import { chapterCompleteSchema, batchSubjectChapterParamSchema } from '@/lib/validators/admin.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

// Marks a chapter complete/incomplete — reversible, not a lock. See
// admin.service.ts's toggleBatchSubjectChapterComplete doc comment.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subjectId: string; chapterId: string }> }
) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const tenantId = requireTenantId(user);
    await requireActiveSubscription(tenantId);
    const { id: batchId, subjectId, chapterId } = validateBody(batchSubjectChapterParamSchema, await params);
    const { completed } = validateBody(chapterCompleteSchema, await req.json());
    const result = await svc.toggleBatchSubjectChapterComplete(tenantId, batchId, subjectId, chapterId, user.userId, completed);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
