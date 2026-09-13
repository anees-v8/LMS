import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/admin.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { validateBody } from '@/lib/middleware/validate';
import { updateBatchSchema, idParamSchema } from '@/lib/validators/admin.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

// New: edit a batch's name/grade/subjects.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const { id } = validateBody(idParamSchema, await params);
    const body = validateBody(updateBatchSchema, await req.json());
    const result = await svc.updateBatch(requireTenantId(user), id, user.userId, body);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

// New: remove a batch. Hard-deletes if it has no enrolled students;
// otherwise soft-deletes (marks inactive) to keep historical records intact
// — see admin.service.ts's deleteBatch doc comment for why.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const { id } = validateBody(idParamSchema, await params);
    const result = await svc.deleteBatch(requireTenantId(user), id, user.userId);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
