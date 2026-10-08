import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/admin.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { requireActiveSubscription } from '@/lib/middleware/subscriptionGuard';
import { validateBody } from '@/lib/middleware/validate';
import { idParamSchema } from '@/lib/validators/admin.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

// Ported from Express: router.patch('/students/:id/suspend', subscriptionGuard, validate(idParamSchema, 'params'), ctrl.suspendStudent)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const tenantId = requireTenantId(user);
    await requireActiveSubscription(tenantId);
    const { id } = validateBody(idParamSchema, await params);
    const result = await svc.suspendStudent(tenantId, user.userId, id);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
