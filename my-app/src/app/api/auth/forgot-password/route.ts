import { NextRequest, NextResponse } from 'next/server';
import * as authService from '@/lib/services/auth.service';
import { validateBody } from '@/lib/middleware/validate';
import { forgotPasswordSchema } from '@/lib/validators/auth.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

// Unauthenticated — proof of phone number triggers OTP generation.
// Returns success: true and masked target (email or phone) for UI feedback.
export async function POST(req: NextRequest) {
  try {
    const body = validateBody(forgotPasswordSchema, await req.json());
    const result = await authService.forgotPassword(body);
    return NextResponse.json({ success: true, target: result?.target });
  } catch (err) {
    return handleApiError(err);
  }
}
