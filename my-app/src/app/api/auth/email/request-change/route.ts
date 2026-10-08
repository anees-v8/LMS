import { NextRequest, NextResponse } from 'next/server';
import * as authService from '@/lib/services/auth.service';
import { requireAuth } from '@/lib/middleware/auth';
import { validateBody } from '@/lib/middleware/validate';
import { requestEmailChangeSchema } from '@/lib/validators/auth.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

// Any authenticated role — sends an OTP to the NEW address, which must be
// confirmed (see email/confirm-change) before it's actually saved.
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const { newEmail } = validateBody(requestEmailChangeSchema, await req.json());
    await authService.requestEmailChange({ userId: user.userId, newEmail });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
