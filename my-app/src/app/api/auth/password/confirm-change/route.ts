import { NextRequest, NextResponse } from 'next/server';
import * as authService from '@/lib/services/auth.service';
import { requireAuth } from '@/lib/middleware/auth';
import { validateBody } from '@/lib/middleware/validate';
import { confirmPasswordChangeSchema } from '@/lib/validators/auth.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const { otp, newPassword } = validateBody(confirmPasswordChangeSchema, await req.json());
    await authService.confirmPasswordChange({ userId: user.userId, otp, newPassword });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
