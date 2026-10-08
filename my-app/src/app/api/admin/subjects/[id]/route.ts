import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/admin.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { requireActiveSubscription } from '@/lib/middleware/subscriptionGuard';
import { validateBody } from '@/lib/middleware/validate';
import { createSubjectSchema } from '@/lib/validators/admin.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

// Ported from Express: router.put('/subjects/:id', subscriptionGuard, validate(createSubjectSchema), ctrl.updateSubject)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const tenantId = requireTenantId(user);
    await requireActiveSubscription(tenantId);
    const { id: rawId } = await params;
    const id = Number(rawId);
    const body = validateBody(createSubjectSchema, await req.json());
    const result = await svc.updateSubject(tenantId, id, body);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

// Ported from Express: router.delete('/subjects/:id', subscriptionGuard, ctrl.deleteSubject)
// Note: no validate(idParamSchema, 'params') on this route in the original
// Express router either — deleteSubject controller reads req.params.id raw.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const tenantId = requireTenantId(user);
    await requireActiveSubscription(tenantId);
    const { id: rawId } = await params;
    const id = Number(rawId);
    const result = await svc.deleteSubject(tenantId, id, user.userId);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
