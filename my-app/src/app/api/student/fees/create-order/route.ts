import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/student.service';
import * as rzpSvc from '@/lib/services/razorpay.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/utils/apiResponse';
import ApiError from '@/lib/utils/ApiError';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, 'student');
    const tenantId = requireTenantId(user);
    const body = await req.json();

    const amount = Number(body.amount);
    if (!amount || isNaN(amount) || amount <= 0) {
      throw ApiError.badRequest('INVALID_AMOUNT', 'Invalid fee amount');
    }

    const feeInfo = await svc.fees(tenantId, user.userId);
    if (feeInfo.pending <= 0) {
      throw ApiError.badRequest('NO_PENDING_FEE', 'You have no pending fees left to pay.');
    }
    if (amount > feeInfo.pending) {
      throw ApiError.badRequest(
        'EXCEEDS_PENDING_FEE',
        `Payment amount (₹${amount}) cannot exceed the pending fee balance of ₹${feeInfo.pending}.`
      );
    }

    const studentId = await svc.getStudentId(tenantId, user.userId);
    const result = await rzpSvc.createFeeOrder(tenantId, studentId, amount);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
