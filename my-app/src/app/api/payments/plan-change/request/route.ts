import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/subscription.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { validateBody } from '@/lib/middleware/validate';
import { requestPlanChangeSchema } from '@/lib/validators/payment.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

// Creates a Razorpay order for the prorated+penalty-adjusted amount due.
// The plan itself is not switched until /confirm verifies payment.
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const body = validateBody(requestPlanChangeSchema, await req.json());
    const result = await svc.requestPlanChange(requireTenantId(user), body.planCatalogId, body.billingCycle, body.studentCount);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
