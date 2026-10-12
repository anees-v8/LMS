import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/teacher.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { validateBody } from '@/lib/middleware/validate';
import { toggleChapterCompleteSchema } from '@/lib/validators/teacher.validators';
import { handleApiError } from '@/lib/utils/apiResponse';
import { z } from 'zod';

const chapterIdParamSchema = z.object({ chapterId: z.coerce.number().int().positive() }).strict();

// Marks a chapter taught/complete (or reverts it) for a batch+subject this
// teacher is assigned to.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  try {
    const user = requireAuth(req, 'teacher');
    const tenantId = requireTenantId(user);
    const { chapterId } = validateBody(chapterIdParamSchema, await params);
    const { batchId, subjectId, completed } = validateBody(toggleChapterCompleteSchema, await req.json());
    const result = await svc.toggleChapterComplete(tenantId, user.userId, batchId, subjectId, chapterId, completed);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
