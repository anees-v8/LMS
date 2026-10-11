import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/admin.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { requireActiveSubscription } from '@/lib/middleware/subscriptionGuard';
import { validateBody } from '@/lib/middleware/validate';
import { createTeacherSchema } from '@/lib/validators/admin.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

// Ported from Express: router.get('/teachers', ctrl.listTeachers)
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const result = await svc.listTeachers(requireTenantId(user));
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

// Ported from Express: router.post('/teachers', subscriptionGuard, validate(createTeacherSchema), ctrl.createTeacher)
// Numeric per-plan teacher limit (plan_catalog.flat_teacher_limit) is
// enforced inside createTeacher() itself, not a separate feature-gate —
// see its doc comment.
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const tenantId = requireTenantId(user);
    await requireActiveSubscription(tenantId);
    const body = validateBody(createTeacherSchema, await req.json());
    const result = await svc.createTeacher(tenantId, user.userId, body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
