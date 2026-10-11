import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/teacher.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { validateBody } from '@/lib/middleware/validate';
import { createChapterSchema } from '@/lib/validators/teacher.validators';
import { handleApiError } from '@/lib/utils/apiResponse';
import { z } from 'zod';

const listChaptersQuerySchema = z
  .object({
    batchId: z.coerce.number().int().positive(),
    subjectId: z.coerce.number().int().positive(),
  })
  .strict();

// Ported from Express: router.get('/chapters', ctrl.listChapters)
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req, 'teacher');
    const query = Object.fromEntries(req.nextUrl.searchParams);
    const { batchId, subjectId } = validateBody(listChaptersQuerySchema, query);
    const result = await svc.listChapters(requireTenantId(user), user.userId, batchId, subjectId);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

// Ported from Express: router.post('/chapters', validate(createChapterSchema), ctrl.createChapter)
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, 'teacher');
    const body = validateBody(createChapterSchema, await req.json());
    const result = await svc.createChapter(requireTenantId(user), user.userId, body.batchId, body.subjectId, body.name);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
