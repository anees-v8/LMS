import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/subscription.service';
import { requireAuth } from '@/lib/middleware/auth';
import { validateBody } from '@/lib/middleware/validate';
import { updatePlatformSettingsSchema } from '@/lib/validators/superadmin.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

export async function GET(req: NextRequest) {
  try {
    requireAuth(req, 'super_admin');
    const downgradePenaltyAmount = await svc.getDowngradePenaltyAmount();
    return NextResponse.json({ downgradePenaltyAmount });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = requireAuth(req, 'super_admin');
    const body = validateBody(updatePlatformSettingsSchema, await req.json());
    const downgradePenaltyAmount = await svc.setDowngradePenaltyAmount(body.downgradePenaltyAmount, user.userId);
    return NextResponse.json({ downgradePenaltyAmount });
  } catch (err) {
    return handleApiError(err);
  }
}
