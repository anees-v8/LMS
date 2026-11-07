import { NextRequest, NextResponse } from 'next/server';
import { generateSignature } from '@/lib/services/cloudinary.service';
import { requireAuth } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/utils/apiResponse';

// Cloudinary signature for profile-photo / institute logo uploads — any authenticated user
export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    return NextResponse.json(generateSignature('campus/avatars'));
  } catch (err) {
    return handleApiError(err);
  }
}
