import { NextRequest, NextResponse } from 'next/server';
import * as leadService from '@/lib/services/lead.service';
import { requireAuth } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/utils/apiResponse';

export async function POST(req: NextRequest) {
  try {
    requireAuth(req, 'super_admin');
    const updatedCount = await leadService.markAllRead();
    return NextResponse.json({ success: true, updatedCount });
  } catch (err) {
    return handleApiError(err);
  }
}
