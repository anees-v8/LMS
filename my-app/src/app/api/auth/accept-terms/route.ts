import { NextRequest, NextResponse } from 'next/server';
import * as authService from '@/lib/services/auth.service';
import { requireAuth } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/utils/apiResponse';

// Stamps the caller as having accepted the current Privacy Policy/Terms
// version. No request body — the version is server-authoritative
// (authService.CURRENT_TERMS_VERSION), never client-supplied.
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const result = await authService.acceptTerms({ userId: user.userId });
    return NextResponse.json({ user: result });
  } catch (err) {
    return handleApiError(err);
  }
}
