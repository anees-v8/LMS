import { NextRequest, NextResponse } from 'next/server';
import * as adminSvc from '@/lib/services/admin.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/utils/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const result = await adminSvc.getPaymentSettings(requireTenantId(user));
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = requireAuth(req, 'coaching_admin');
    const body = await req.json();
    const result = await adminSvc.updatePaymentSettings(
      requireTenantId(user),
      body.keyId,
      body.secret
    );
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
