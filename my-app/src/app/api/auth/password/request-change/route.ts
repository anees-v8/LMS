import { NextRequest, NextResponse } from 'next/server';
import * as authService from '@/lib/services/auth.service';
import { requireAuth } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/utils/apiResponse';

// No body — sends an OTP to the email already on file (never a
// client-supplied address), proving the request came from the account
// owner before a password can actually change.
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await authService.requestPasswordChange({ userId: user.userId });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
