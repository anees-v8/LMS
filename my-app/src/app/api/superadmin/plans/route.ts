import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import * as svc from '@/lib/services/plan.service';
import { requireAuth } from '@/lib/middleware/auth';
import { validateBody } from '@/lib/middleware/validate';
import { createPlanSchema } from '@/lib/validators/plan.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

// Ported from Express: router.get('/plans', planCtrl.listPlans)  — all plans including inactive
export async function GET(req: NextRequest) {
  try {
    requireAuth(req, 'super_admin');
    const result = await svc.listPlans(false);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

// Ported from Express: router.post('/plans', validate(createPlanSchema), planCtrl.createPlan)
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, 'super_admin');
    const body = validateBody(createPlanSchema, await req.json());
    const result = await svc.createPlan(body, user.userId);
    try {
      revalidatePath('/api/public/plans');
      revalidatePath('/pricing');
    } catch {
      // Best-effort cache invalidation
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
