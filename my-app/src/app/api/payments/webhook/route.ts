import { NextRequest, NextResponse } from 'next/server';
import env from '@/lib/config/env';
import logger from '@/lib/utils/logger';
import {
  verifyWebhookSignature,
  processWebhookEvent,
  getTenantRazorpayKeys,
} from '@/lib/services/razorpay.service';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      logger.warn('Razorpay webhook: Missing x-razorpay-signature header');
      return NextResponse.json({ error: 'MISSING_SIGNATURE' }, { status: 400 });
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      logger.warn('Razorpay webhook: Failed to parse raw body as JSON');
      return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
    }

    // Try platform webhook secret first
    let isValid = verifyWebhookSignature(rawBody, signature, env.razorpay.webhookSecret);

    // If verification failed and tenantId is present in event notes, try tenant's webhook secret
    if (!isValid) {
      const notes = {
        ...(event?.payload?.order?.entity?.notes || {}),
        ...(event?.payload?.payment?.entity?.notes || {}),
      };
      const tenantIdStr = notes.tenantId;
      if (tenantIdStr) {
        const tenantId = parseInt(tenantIdStr, 10);
        if (!isNaN(tenantId)) {
          try {
            const tenantKeys = await getTenantRazorpayKeys(tenantId);
            if (tenantKeys.secret) {
              isValid = verifyWebhookSignature(rawBody, signature, tenantKeys.secret);
            }
          } catch {
            // ignore
          }
        }
      }
    }

    if (!isValid) {
      logger.error('Razorpay webhook: Signature verification failed', {
        receivedSignature: signature,
      });
      return NextResponse.json({ error: 'INVALID_SIGNATURE' }, { status: 400 });
    }

    // Process event
    const result = await processWebhookEvent(event);
    return NextResponse.json({ status: 'ok', ...result });
  } catch (err: any) {
    logger.error('Razorpay webhook: Error processing event', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
