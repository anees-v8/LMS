import type { Request, Response } from 'express';
import * as svc from '../services/razorpay.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { tenantId, userId } from './helpers.js';

export const createOrder = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.createOrder(tenantId(req)))
);

export const verify = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.verifyPayment(tenantId(req), userId(req), req.body))
);

export const status = asyncHandler(async (req: Request, res: Response) =>
  res.json(await svc.subscriptionStatus(tenantId(req)))
);

export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  if (!signature) {
    logger.warn('Razorpay webhook: Missing x-razorpay-signature header');
    res.status(400).json({ error: 'Missing x-razorpay-signature header' });
    return;
  }

  const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
  const webhookSecret = env.razorpay.webhookSecret || env.razorpay.secret;

  let isValid = false;
  if (webhookSecret) {
    isValid = svc.verifyWebhookSignature(rawBody, signature, webhookSecret);
  }

  // If not valid with platform secret, check if this is an institute-level BYOG webhook
  if (!isValid && req.body?.payload?.payment?.entity?.notes?.tenantId) {
    const tId = parseInt(req.body.payload.payment.entity.notes.tenantId, 10);
    if (tId) {
      try {
        const tenantKeys = await svc.getTenantRazorpayKeys(tId);
        if (tenantKeys?.secret) {
          isValid = svc.verifyWebhookSignature(rawBody, signature, tenantKeys.secret);
        }
      } catch {
        // Ignore lookup error, will fail validation below
      }
    }
  }

  if (!isValid) {
    logger.warn('Razorpay webhook: Invalid signature or secret not configured');
    res.status(400).json({ error: 'Invalid webhook signature' });
    return;
  }

  const result = await svc.processWebhookEvent(req.body);
  res.status(200).json({ status: 'ok', ...result });
});

