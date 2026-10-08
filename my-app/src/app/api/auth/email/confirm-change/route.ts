import { NextRequest, NextResponse } from 'next/server';
import * as authService from '@/lib/services/auth.service';
import { requireAuth } from '@/lib/middleware/auth';
import { validateBody } from '@/lib/middleware/validate';
import { confirmEmailChangeSchema } from '@/lib/validators/auth.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const { newEmail, otp } = validateBody(confirmEmailChangeSchema, await req.json());
    const result = await authService.confirmEmailChange({ userId: user.userId, newEmail, otp });
    return NextResponse.json({ user: result });
  } catch (err) {
    return handleApiError(err);
  }
}
