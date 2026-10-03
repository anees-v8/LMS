import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { query } from '../db';
import env from '../config/env';
import ApiError from '../utils/ApiError';
import logger from '../utils/logger';

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

async function getTenantRazorpayKeys(tenantId: number) {
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
  const rzp = new Razorpay({ key_id: keys.key_id, key_secret: keys.secret });
  
  const amountPaise = Math.round(amountRupees * 100);
  
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
  
  const expected = crypto
    .createHmac('sha256', keys.secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
    
  if (expected !== signature) {
    throw ApiError.badRequest('INVALID_SIGNATURE', 'Payment signature verification failed');
  }

  // If valid, record the payment directly into the database
  return { success: true, paymentId, amountPaid, feeStructureId };
}
