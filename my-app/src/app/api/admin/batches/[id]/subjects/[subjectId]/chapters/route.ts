import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/admin.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { requireActiveSubscription } from '@/lib/middleware/subscriptionGuard';
import { validateBody } from '@/lib/middleware/validate';
import { chapterNameSchema, batchSubjectParamSchema } from '@/lib/validators/admin.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

// Chapters live per (batch, subject) — a subject is a tenant-wide tag
// reused across unrelated batches/grades, so curriculum is managed one
// batch's subject-offering at a time, not the subject alone.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subjectId: string }> }
) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const tenantId = requireTenantId(user);
    const { id: batchId, subjectId } = validateBody(batchSubjectParamSchema, await params);
    const result = await svc.listBatchSubjectChapters(tenantId, batchId, subjectId);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subjectId: string }> }
) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const tenantId = requireTenantId(user);
    await requireActiveSubscription(tenantId);
    const { id: batchId, subjectId } = validateBody(batchSubjectParamSchema, await params);
    const body = validateBody(chapterNameSchema, await req.json());
    const result = await svc.addBatchSubjectChapter(tenantId, batchId, subjectId, body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
