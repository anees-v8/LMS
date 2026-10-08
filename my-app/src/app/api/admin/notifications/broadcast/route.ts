import { NextRequest, NextResponse } from 'next/server';
import * as notificationCenter from '@/lib/services/notificationCenter.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { requireActiveSubscription } from '@/lib/middleware/subscriptionGuard';
import { validateBody } from '@/lib/middleware/validate';
import { broadcastNotificationSchema } from '@/lib/validators/admin.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

// Ported from Express: router.post('/notifications/broadcast', subscriptionGuard, validate(broadcastNotificationSchema), ctrl.broadcastNotification)
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const tenantId = requireTenantId(user);
    await requireActiveSubscription(tenantId);
    const { title, body, targetRole, batchId } = validateBody(broadcastNotificationSchema, await req.json());
    const result = await notificationCenter.broadcastNotification(
      { title, body, targetRole, tenantId, batchId },
      user.userId
    );
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
