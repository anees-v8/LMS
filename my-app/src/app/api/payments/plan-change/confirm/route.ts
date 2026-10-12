import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/subscription.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { validateBody } from '@/lib/middleware/validate';
import { confirmPlanChangeSchema } from '@/lib/validators/payment.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

// Verifies the Razorpay payment (if any was due) and switches the tenant
// onto the new plan/cycle, stamping a fresh billing cycle.
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const body = validateBody(confirmPlanChangeSchema, await req.json());
    const result = await svc.confirmPlanChange(
      requireTenantId(user),
      user.userId,
      body.planCatalogId,
      body.billingCycle,
      {
        orderId: body.orderId,
        paymentId: body.paymentId,
        signature: body.signature,
      },
      body.studentCount
    );
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
