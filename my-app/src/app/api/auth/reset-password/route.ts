import { NextRequest, NextResponse } from 'next/server';
import * as authService from '@/lib/services/auth.service';
import { validateBody } from '@/lib/middleware/validate';
import { resetPasswordSchema } from '@/lib/validators/auth.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

// Unauthenticated — proof of ownership is the OTP itself, not a session.
export async function POST(req: NextRequest) {
  try {
    const body = validateBody(resetPasswordSchema, await req.json());
    await authService.resetPassword(body);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
