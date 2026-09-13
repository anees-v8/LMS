import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/admin.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { validateBody } from '@/lib/middleware/validate';
import { idParamSchema } from '@/lib/validators/admin.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

// Ported from Express: router.put('/students/:id', subscriptionGuard, ctrl.updateStudent)
// TODO: port subscriptionGuard when subscription/plan features are migrated
// No validator on this route in the original Express router — req.body is
// passed straight through to the service, same as the original behavior.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const { id: rawId } = await params;
    const id = Number(rawId);
    const body = await req.json();
    const result = await svc.updateStudent(requireTenantId(user), user.userId, id, body);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

// Ported from Express: router.delete('/students/:id', subscriptionGuard, validate(idParamSchema, 'params'), ctrl.deleteStudent)
// TODO: port subscriptionGuard when subscription/plan features are migrated
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const { id } = validateBody(idParamSchema, await params);
    const result = await svc.deleteStudent(requireTenantId(user), user.userId, id);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
