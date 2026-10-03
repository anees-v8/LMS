import { NextRequest, NextResponse } from 'next/server';
import * as authService from '@/lib/services/auth.service';
import { handleApiError } from '@/lib/utils/apiResponse';
import ApiError from '@/lib/utils/ApiError';

// Unauthenticated — called as the user types their phone number on the
// login form, before a password exists to authenticate with. Lets the
// login screen show the "accept terms" checkbox only when actually needed,
// instead of on every login regardless of prior acceptance.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    if (!phone || !/^\d{10,15}$/.test(phone)) {
      throw ApiError.badRequest('INVALID_PHONE', 'Phone must be 10-15 digits');
    }
    const result = await authService.checkTermsStatus({ phone });
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
