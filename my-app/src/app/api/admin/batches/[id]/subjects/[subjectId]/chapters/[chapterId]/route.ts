import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/admin.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { requireActiveSubscription } from '@/lib/middleware/subscriptionGuard';
import { validateBody } from '@/lib/middleware/validate';
import { chapterNameSchema, batchSubjectChapterParamSchema } from '@/lib/validators/admin.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subjectId: string; chapterId: string }> }
) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const tenantId = requireTenantId(user);
    await requireActiveSubscription(tenantId);
    const { id: batchId, subjectId, chapterId } = validateBody(batchSubjectChapterParamSchema, await params);
    const body = validateBody(chapterNameSchema, await req.json());
    const result = await svc.renameBatchSubjectChapter(tenantId, batchId, subjectId, chapterId, body);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

// Blocked (409) if content was ever uploaded under this chapter — see
// admin.service.ts's removeBatchSubjectChapter doc comment.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subjectId: string; chapterId: string }> }
) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const tenantId = requireTenantId(user);
    await requireActiveSubscription(tenantId);
    const { id: batchId, subjectId, chapterId } = validateBody(batchSubjectChapterParamSchema, await params);
    const result = await svc.removeBatchSubjectChapter(tenantId, batchId, subjectId, chapterId);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
