import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/lib/services/student.service';
import * as rzpSvc from '@/lib/services/razorpay.service';
import * as adminSvc from '@/lib/services/admin.service';
import { requireAuth, requireTenantId } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/utils/apiResponse';
import ApiError from '@/lib/utils/ApiError';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, 'student');
    const tenantId = requireTenantId(user);
    const body = await req.json();

    const { orderId, paymentId, signature, feeDueId } = body;

    const studentId = await svc.getStudentId(tenantId, user.userId);

    // Verify signature AND fetch the real captured amount from Razorpay —
    // never trust a client-supplied amount here (see verifyFeePayment's
    // doc comment: the HMAC signature alone doesn't cover the amount).
    const verified = await rzpSvc.verifyFeePayment(
      tenantId,
      studentId,
      { orderId, paymentId, signature }
    );
    const amount = verified.amountPaid;
    if (!amount || amount <= 0) {
      throw ApiError.badRequest('INVALID_AMOUNT', 'Invalid fee amount');
    }

    const feeInfo = await svc.fees(tenantId, user.userId);
    if (amount > feeInfo.pending) {
      throw ApiError.badRequest(
        'EXCEEDS_PENDING_FEE',
        `Payment amount (₹${amount}) cannot exceed the pending fee balance of ₹${feeInfo.pending}.`
      );
    }

    // Record payment in fee_payments & triggers email receipt
    const result = await adminSvc.recordPayment(tenantId, user.userId, {
      studentId,
      feeDueId: feeDueId ? Number(feeDueId) : undefined,
      amountPaid: amount,
      method: 'online',
    });

    return NextResponse.json({
      success: true,
      receiptNo: result.receiptNo,
      payment: result.payment,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
