import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import * as svc from '@/lib/services/plan.service';
import { requireAuth } from '@/lib/middleware/auth';
import { validateBody } from '@/lib/middleware/validate';
import { idParamSchema } from '@/lib/validators/superadmin.validators';
import { updatePlanSchema } from '@/lib/validators/plan.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

// Ported from Express: router.get('/plans/:id', validate(idParamSchema, 'params'), planCtrl.getPlan)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAuth(req, 'super_admin');
    const { id } = validateBody(idParamSchema, await params);
    const result = await svc.getPlanById(id);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

// Ported from Express: router.put('/plans/:id', validate(idParamSchema, 'params'), validate(updatePlanSchema), planCtrl.updatePlan)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req, 'super_admin');
    const { id } = validateBody(idParamSchema, await params);
    const body = validateBody(updatePlanSchema, await req.json());
    const result = await svc.updatePlan(id, body, user.userId);
    try {
      revalidatePath('/api/public/plans');
      revalidatePath('/pricing');
    } catch {
      // Best-effort cache invalidation
    }
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

// Ported from Express: router.delete('/plans/:id', validate(idParamSchema, 'params'), planCtrl.deactivatePlan)  — soft deactivate
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireAuth(req, 'super_admin');
    const { id } = validateBody(idParamSchema, await params);
    const result = await svc.deactivatePlan(id, user.userId);
    try {
      revalidatePath('/api/public/plans');
      revalidatePath('/pricing');
    } catch {
      // Best-effort cache invalidation
    }
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
