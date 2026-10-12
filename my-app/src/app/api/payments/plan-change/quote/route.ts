import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/subscription.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { validateBody } from '@/lib/middleware/validate';
import { quotePlanChangeSchema } from '@/lib/validators/payment.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

// Preview the bill for switching plan/cycle — no side effects.
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const body = validateBody(quotePlanChangeSchema, await req.json());
    const result = await svc.quotePlanChange(requireTenantId(user), body.planCatalogId, body.billingCycle, body.studentCount);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
