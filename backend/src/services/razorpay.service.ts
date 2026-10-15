import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { query } from '../config/db.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { recordPayment } from './admin.service.js';

interface SubscriptionRow {
  id: number;
  plan: string;
  amount: number;
  status: string;
  trialEndsAt: Date | null;
  nextBillingDate: Date | null;
  // New per-student pricing fields
  planCatalogId: number | null;
  billingCycle: string;
  perStudentRate: number | null;
}

export interface CreateOrderResult {
  orderId: string;
  amount: number;        // total in paise
  amountRupees: number;  // total in ₹ (for display)
  currency: string;
  keyId: string;
  studentCount: number;
  perStudentRate: number;
  billingCycle: string;
  mock?: boolean;
}

export interface VerifyPaymentInput {
  orderId: string;
  paymentId: string;
  signature?: string;
}

export interface VerifyPaymentResult {
  status: string;
  nextBillingDate: Date | null;
}

/** Billing cycle multipliers (months count for next_billing_date interval) */
const CYCLE_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

let _client: Razorpay | null = null;
function client(): Razorpay | null {
  if (!env.razorpay.enabled) return null;
  if (!_client) {
    _client = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.secret });
  }
  return _client;
}

async function getSubscription(tenantId: number): Promise<SubscriptionRow> {
  const { rows } = await query<SubscriptionRow>(
    `SELECT id, plan, amount, status,
            trial_ends_at AS "trialEndsAt",
            next_billing_date AS "nextBillingDate",
            plan_catalog_id AS "planCatalogId",
            billing_cycle AS "billingCycle",
            per_student_rate AS "perStudentRate"
       FROM subscriptions WHERE tenant_id=$1`,
    [tenantId]
  );
  if (!rows[0]) throw ApiError.notFound('NO_SUBSCRIPTION');
  return rows[0];
}

export async function subscriptionStatus(tenantId: number): Promise<SubscriptionRow> {
  return getSubscription(tenantId);
}

/** Create a Razorpay order.
 *  - If per_student_rate is set: calculates amount = rate × students × months
 *  - Falls back to flat amount for legacy flat-plan tenants
 */
export async function createOrder(tenantId: number): Promise<CreateOrderResult> {
  const sub = await getSubscription(tenantId);

  let finalAmountRupees: number;
  let studentCount = 0;
  let perStudentRate = 0;
  const billingCycle = sub.billingCycle ?? 'monthly';
  const cycleMonths = CYCLE_MONTHS[billingCycle] ?? 1;

  if (sub.perStudentRate && sub.planCatalogId) {
    // Per-student pricing: count active students for this tenant
    const { rows: countRows } = await query<{ count: string }>(
      `SELECT count(*)::text AS count FROM students WHERE tenant_id = $1`,
      [tenantId]
    );
    studentCount = parseInt(countRows[0]?.count ?? '0', 10);
    if (studentCount === 0) {
      throw ApiError.badRequest('NO_STUDENTS', 'Cannot create subscription order: no students enrolled yet.');
    }
    perStudentRate = sub.perStudentRate;
    finalAmountRupees = perStudentRate * studentCount * cycleMonths;
  } else {
    // Legacy flat plan
    finalAmountRupees = sub.amount;
    perStudentRate = sub.amount;
  }

  const amountPaise = finalAmountRupees * 100;

  if (!env.razorpay.enabled) {
    logger.warn('Razorpay not configured — returning mock order (dev only)');
    return {
      orderId: `order_mock_${Date.now()}`,
      amount: amountPaise,
      amountRupees: finalAmountRupees,
      currency: 'INR',
      keyId: 'rzp_test_mock',
      studentCount,
      perStudentRate,
      billingCycle,
      mock: true,
    };
  }

  const rzp = client();
  if (!rzp) throw ApiError.badRequest('RAZORPAY_NOT_CONFIGURED', 'Payment gateway not configured');

  const order = await rzp.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `sub_${sub.id}_${Date.now()}`,
    notes: { tenantId: String(tenantId), billingCycle, studentCount: String(studentCount) },
  });

  return {
    orderId: order.id,
    amount: Number(order.amount),
    amountRupees: finalAmountRupees,
    currency: order.currency,
    keyId: env.razorpay.keyId,
    studentCount,
    perStudentRate,
    billingCycle,
  };
}

/**
 * Verify Razorpay payment signature server-side, then activate the subscription.
 * Snapshots the student count and calculates next_billing_date from billing cycle.
 */
export async function verifyPayment(
  tenantId: number,
  actorUserId: number,
  { orderId, paymentId, signature }: VerifyPaymentInput
): Promise<VerifyPaymentResult> {
  if (env.razorpay.enabled) {
    const expected = crypto
      .createHmac('sha256', env.razorpay.secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    if (expected !== signature) {
      throw ApiError.badRequest('INVALID_SIGNATURE', 'Payment signature verification failed');
    }
  } else if (!String(orderId).startsWith('order_mock_')) {
    throw ApiError.badRequest('RAZORPAY_NOT_CONFIGURED', 'Payment gateway not configured');
  }

  // Get current subscription to know billing cycle
  const sub = await getSubscription(tenantId);
  const cycleMonths = CYCLE_MONTHS[sub.billingCycle ?? 'monthly'] ?? 1;

  // Snapshot current student count at payment time
  const { rows: countRows } = await query<{ count: string }>(
    `SELECT count(*)::text AS count FROM students WHERE tenant_id = $1`,
    [tenantId]
  );
  const studentCountSnapshot = parseInt(countRows[0]?.count ?? '0', 10);

  const { rows } = await query<{ status: string; nextBillingDate: Date | null }>(
    `UPDATE subscriptions
        SET status = 'active',
            next_billing_date = now() + ($2 || ' months')::interval,
            student_count_snapshot = $3,
            amount = COALESCE(per_student_rate, amount) * GREATEST($3, 1) * $4
      WHERE tenant_id = $1
      RETURNING status, next_billing_date AS "nextBillingDate"`,
    [tenantId, cycleMonths, studentCountSnapshot, cycleMonths]
  );

  await query(
    `INSERT INTO audit_log (tenant_id, actor_user_id, action, entity, meta)
     VALUES ($1,$2,'payment_verified','subscription', $3::jsonb)`,
    [tenantId, actorUserId, JSON.stringify({ orderId, paymentId, studentCountSnapshot, cycleMonths })]
  );

  return { status: rows[0].status, nextBillingDate: rows[0].nextBillingDate };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Tenant (Institute) BYOG (Bring Your Own Gateway) Payment Logic
 * Used when a Student pays their Fee to the Institute.
 * ───────────────────────────────────────────────────────────────────────────── */

export async function getTenantRazorpayKeys(tenantId: number) {
  const { rows } = await query(
    `SELECT razorpay_key_id AS key_id, razorpay_secret AS secret FROM tenants WHERE id = $1`,
    [tenantId]
  );
  const keys = rows[0];
  if (!keys || !keys.key_id || !keys.secret) {
    throw ApiError.badRequest('PAYMENT_NOT_CONFIGURED', 'Institute has not configured online payments.');
  }
  return keys;
}

export async function createFeeOrder(tenantId: number, studentId: number, amountRupees: number) {
  const keys = await getTenantRazorpayKeys(tenantId);
  const amountPaise = Math.round(amountRupees * 100);

  if (keys.key_id === 'rzp_test_mock' || keys.key_id.startsWith('mock_')) {
    logger.warn('Mock tenant Razorpay keys detected — returning mock order');
    return {
      orderId: `order_fee_mock_${Date.now()}`,
      amount: amountPaise,
      amountRupees,
      currency: 'INR',
      keyId: keys.key_id,
      mock: true,
    };
  }

  const rzp = new Razorpay({ key_id: keys.key_id, key_secret: keys.secret });
  
  const order = await rzp.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `fee_${studentId}_${Date.now()}`,
    notes: { tenantId: String(tenantId), studentId: String(studentId) },
  });

  return {
    orderId: order.id,
    amount: Number(order.amount),
    amountRupees,
    currency: order.currency,
    keyId: keys.key_id,
  };
}

export async function verifyFeePayment(
  tenantId: number,
  studentId: number,
  { orderId, paymentId, signature }: VerifyPaymentInput,
  amountPaid: number,
  feeStructureId?: number
) {
  const keys = await getTenantRazorpayKeys(tenantId);
  
  if (orderId.startsWith('order_fee_mock_') || keys.key_id === 'rzp_test_mock') {
    return { success: true, paymentId, amountPaid, feeStructureId };
  }

  const expected = crypto
    .createHmac('sha256', keys.secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
    
  if (expected !== signature) {
    throw ApiError.badRequest('INVALID_SIGNATURE', 'Payment signature verification failed');
  }

  return { success: true, paymentId, amountPaid, feeStructureId };
}

/**
 * Verify Razorpay Webhook signature using HMAC SHA256 timing-safe comparison.
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) return false;
  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    if (expected.length !== signature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'));
  } catch {
    return false;
  }
}

/**
 * Process Razorpay webhook events: order.paid, payment.captured, payment.failed.
 * Handles both SaaS subscription activation and Student fee recording idempotently.
 */
export async function processWebhookEvent(event: any): Promise<{ handled: boolean; reason?: string }> {
  const eventType = event?.event;
  if (!eventType) return { handled: false, reason: 'NO_EVENT_TYPE' };

  if (eventType === 'order.paid' || eventType === 'payment.captured') {
    const payment = event.payload?.payment?.entity;
    const order = event.payload?.order?.entity;

    const orderId = payment?.order_id || order?.id;
    const paymentId = payment?.id;
    const amountPaise = Number(payment?.amount || order?.amount || 0);
    const receipt = order?.receipt || '';
    const notes = { ...(order?.notes || {}), ...(payment?.notes || {}) };

    if (!orderId && !paymentId) {
      return { handled: false, reason: 'NO_ORDER_OR_PAYMENT_ID' };
    }

    const tenantIdStr = notes.tenantId;
    const tenantId = tenantIdStr ? parseInt(tenantIdStr, 10) : null;
    if (!tenantId || isNaN(tenantId)) {
      logger.warn('Razorpay webhook: Missing tenantId in notes', { orderId, paymentId, notes });
      return { handled: false, reason: 'NO_TENANT_ID' };
    }

    // Check idempotency: If this order/payment was already recorded
    const { rows: existingAudit } = await query(
      `SELECT id FROM audit_log
        WHERE tenant_id = $1
          AND action IN ('payment_verified', 'fee_payment_recorded')
          AND (meta->>'orderId' = $2 OR meta->>'paymentId' = $3)`,
      [tenantId, orderId, paymentId]
    );

    if (existingAudit.length > 0) {
      logger.info(`Razorpay webhook: Order ${orderId} / Payment ${paymentId} already processed (idempotent).`);
      return { handled: true, reason: 'ALREADY_PROCESSED' };
    }

    // Check if it's a student fee payment
    const isFee = (receipt && receipt.startsWith('fee_')) || Boolean(notes.studentId);

    if (isFee) {
      const studentId = parseInt(notes.studentId, 10);
      if (!studentId || isNaN(studentId)) {
        logger.warn('Razorpay webhook: Missing studentId for fee payment', { orderId, notes });
        return { handled: false, reason: 'MISSING_STUDENT_ID' };
      }

      const amountRupees = Math.round(amountPaise / 100);
      const feeStructureId = notes.feeStructureId ? parseInt(notes.feeStructureId, 10) : undefined;

      const { rows: sRows } = await query<{ user_id: number }>(
        `SELECT user_id FROM students WHERE id = $1 AND tenant_id = $2`,
        [studentId, tenantId]
      );
      const actorUserId = sRows[0]?.user_id || 0;

      await recordPayment(tenantId, actorUserId, {
        studentId,
        feeStructureId,
        amountPaid: amountRupees,
        method: 'upi',
      });

      logger.info(`Razorpay webhook: Recorded fee payment of ₹${amountRupees} for student ${studentId}`, {
        tenantId,
        paymentId,
        orderId,
      });
      return { handled: true };
    } else {
      // Platform subscription payment
      const sub = await getSubscription(tenantId);
      const cycleMonths = CYCLE_MONTHS[notes.billingCycle || sub.billingCycle || 'monthly'] ?? 1;

      const { rows: countRows } = await query<{ count: string }>(
        `SELECT count(*)::text AS count FROM students WHERE tenant_id = $1`,
        [tenantId]
      );
      const studentCountSnapshot = parseInt(countRows[0]?.count ?? '0', 10);

      const { rows: adminRows } = await query<{ id: number }>(
        `SELECT id FROM users WHERE tenant_id = $1 AND role = 'coaching_admin' LIMIT 1`,
        [tenantId]
      );
      const actorUserId = adminRows[0]?.id || 0;

      const { rows } = await query<{ status: string; nextBillingDate: Date | null }>(
        `UPDATE subscriptions
            SET status = 'active',
                next_billing_date = now() + ($2 || ' months')::interval,
                student_count_snapshot = $3,
                amount = COALESCE(per_student_rate, amount) * GREATEST($3, 1) * $4
          WHERE tenant_id = $1
          RETURNING status, next_billing_date AS "nextBillingDate"`,
        [tenantId, cycleMonths, studentCountSnapshot, cycleMonths]
      );

      await query(
        `INSERT INTO audit_log (tenant_id, actor_user_id, action, entity, meta)
         VALUES ($1, $2, 'payment_verified', 'subscription', $3::jsonb)`,
        [
          tenantId,
          actorUserId,
          JSON.stringify({
            orderId,
            paymentId,
            studentCountSnapshot,
            cycleMonths,
            source: 'webhook',
          }),
        ]
      );

      logger.info(`Razorpay webhook: Activated subscription for tenant ${tenantId}`, {
        tenantId,
        nextBillingDate: rows[0]?.nextBillingDate,
        paymentId,
        orderId,
      });
      return { handled: true };
    }
  } else if (eventType === 'payment.failed') {
    const payment = event.payload?.payment?.entity;
    logger.warn('Razorpay webhook: Payment failed event received', {
      paymentId: payment?.id,
      orderId: payment?.order_id,
      errorCode: payment?.error_code,
      errorDesc: payment?.error_description,
    });
    return { handled: true, reason: 'PAYMENT_FAILED_LOGGED' };
  }

  return { handled: false, reason: `UNHANDLED_EVENT_${eventType}` };
}


