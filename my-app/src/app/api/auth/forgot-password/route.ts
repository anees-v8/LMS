import { NextRequest, NextResponse } from 'next/server';
import * as authService from '@/lib/services/auth.service';
import { validateBody } from '@/lib/middleware/validate';
import { forgotPasswordSchema } from '@/lib/validators/auth.validators';
import { handleApiError } from '@/lib/utils/apiResponse';

// Unauthenticated — the caller has no token yet. Always returns a generic
// success response regardless of whether the phone matched an account or
// that account has an email on file, so this can't be used to enumerate
// accounts.
export async function POST(req: NextRequest) {
  try {
    const body = validateBody(forgotPasswordSchema, await req.json());
    await authService.forgotPassword(body);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
