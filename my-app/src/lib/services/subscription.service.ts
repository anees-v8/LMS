import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { query, withTransaction } from '../db';
import env from '../config/env';
import ApiError from '../utils/ApiError';
import { writeAudit } from '../utils/audit';
import { getPlanById } from './plan.service';
import { sendSubscriptionReceiptEmail } from './razorpay.service';

let _client: Razorpay | null = null;
function razorpayClient(): Razorpay | null {
  if (!env.razorpay.enabled) return null;
  if (!_client) {
    _client = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.secret });
  }
  return _client;
}

/** Billing cycle multipliers (months), same mapping razorpay.service.ts uses. */
const CYCLE_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

interface CurrentSubRow {
  id: number;
  tenantId: number;
  planCatalogId: number | null;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  perStudentRate: number | null;
  currentCycleStartedAt: Date | null;
  currentCycleAmount: number | null;
  status: string;
}

async function getCurrentSub(tenantId: number): Promise<CurrentSubRow> {
  const { rows } = await query<CurrentSubRow>(
    `SELECT id, tenant_id AS "tenantId", plan_catalog_id AS "planCatalogId",
            billing_cycle AS "billingCycle", per_student_rate AS "perStudentRate",
            current_cycle_started_at AS "currentCycleStartedAt",
            current_cycle_amount AS "currentCycleAmount",
            status
       FROM subscriptions WHERE tenant_id = $1`,
    [tenantId]
  );
  if (!rows[0]) throw ApiError.notFound('NO_SUBSCRIPTION');
  return rows[0];
}

async function activeStudentCount(tenantId: number): Promise<number> {
  const { rows } = await query<{ count: string }>(
    `SELECT count(*)::text AS count FROM students s JOIN users u ON u.id = s.user_id
      WHERE s.tenant_id = $1 AND u.is_active = true`,
    [tenantId]
  );
  return parseInt(rows[0]?.count ?? '0', 10);
}

export async function getDowngradePenaltyAmount(): Promise<number> {
  const { rows } = await query<{ amount: number }>(
    `SELECT downgrade_penalty_amount AS amount FROM platform_settings WHERE id = 1`
  );
  return rows[0]?.amount ?? 0;
}

export async function setDowngradePenaltyAmount(amount: number, actorUserId: number | null): Promise<number> {
  await query(
    `UPDATE platform_settings SET downgrade_penalty_amount = $1, updated_at = now() WHERE id = 1`,
    [amount]
  );
  await writeAudit({ tenantId: null, actorUserId, action: 'downgrade_penalty_updated', entity: 'platform_settings', meta: { amount } });
  return amount;
}

/** Unused-time credit still owed on the subscription's current paid cycle,
 *  as of right now. 0 if there's no cycle in progress (e.g. still on trial,
 *  never paid) or the cycle has already fully elapsed. */
function computeProrationCredit(sub: CurrentSubRow): number {
  if (!sub.currentCycleStartedAt || !sub.currentCycleAmount) return 0;
  const cycleMonths = CYCLE_MONTHS[sub.billingCycle] ?? 1;
  const start = sub.currentCycleStartedAt.getTime();
  const end = start + cycleMonths * 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  if (now >= end) return 0;
  const unusedFraction = (end - now) / (end - start);
  return Math.round(sub.currentCycleAmount * unusedFraction);
}

export interface PlanChangeQuote {
  direction: 'upgrade' | 'downgrade' | 'same';
  newPlanName: string;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  /** Currently active students — the floor `studentCount` can't go below. */
  activeStudentCount: number;
  /** Seats being billed for (>= activeStudentCount). */
  studentCount: number;
  newCycleAmount: number;
  prorationCredit: number;
  penaltyAmount: number;
  amountDue: number;
}

async function buildQuote(
  tenantId: number,
  newPlanCatalogId: number,
  newBillingCycle: 'monthly' | 'quarterly' | 'yearly',
  requestedStudentCount?: number
): Promise<{ sub: CurrentSubRow; quote: PlanChangeQuote }> {
  const sub = await getCurrentSub(tenantId);
  const newPlan = await getPlanById(newPlanCatalogId);
  const activeCount = await activeStudentCount(tenantId);
  if (activeCount === 0) {
    throw ApiError.badRequest('NO_STUDENTS', 'Add at least one active student before subscribing.');
  }

  // The tenant can pay for *more* capacity than they currently use (room to
  // grow), but can never pay for fewer seats than students who are
  // currently active — they must suspend students first to free up seats.
  const studentCount = requestedStudentCount ?? activeCount;
  if (studentCount < activeCount) {
    throw ApiError.badRequest(
      'MUST_SUSPEND_STUDENTS_FIRST',
      `You have ${activeCount} active students. Suspend ${activeCount - studentCount} of them before reducing to ${studentCount}.`
    );
  }

  const rateMap = { monthly: newPlan.priceMonthly, quarterly: newPlan.priceQuarterly, yearly: newPlan.priceYearly };
  const newPerStudentRate = rateMap[newBillingCycle];
  const newCycleMonths = CYCLE_MONTHS[newBillingCycle] ?? 1;
  const newCycleAmount = newPerStudentRate * studentCount * newCycleMonths;

  let direction: 'upgrade' | 'downgrade' | 'same' = 'same';
  if (sub.planCatalogId !== newPlanCatalogId) {
    const currentPlan = sub.planCatalogId ? await getPlanById(sub.planCatalogId) : null;
    const currentRank = currentPlan?.priceMonthly ?? 0;
    direction = newPlan.priceMonthly > currentRank ? 'upgrade' : 'downgrade';
  } else if (CYCLE_MONTHS[newBillingCycle] !== CYCLE_MONTHS[sub.billingCycle]) {
    // Same tier, different cycle length — treat a longer cycle as upgrade-like
    // (no penalty) and a shorter one as downgrade-like (penalty applies),
    // matching the "penalty only when the tenant is committing to less" rule.
    direction = CYCLE_MONTHS[newBillingCycle] > CYCLE_MONTHS[sub.billingCycle] ? 'upgrade' : 'downgrade';
  }

  const prorationCredit = computeProrationCredit(sub);
  const penaltyAmount = direction === 'downgrade' ? await getDowngradePenaltyAmount() : 0;
  const amountDue = Math.max(0, newCycleAmount - prorationCredit + penaltyAmount);

  return {
    sub,
    quote: {
      direction,
      newPlanName: newPlan.name,
      billingCycle: newBillingCycle,
      activeStudentCount: activeCount,
      studentCount,
      newCycleAmount,
      prorationCredit,
      penaltyAmount,
      amountDue,
    },
  };
}

/** Preview a plan change (tenant-facing) — no side effects, just the bill. */
export async function quotePlanChange(
  tenantId: number,
  newPlanCatalogId: number,
  newBillingCycle: 'monthly' | 'quarterly' | 'yearly',
  requestedStudentCount?: number
): Promise<PlanChangeQuote> {
  const { quote } = await buildQuote(tenantId, newPlanCatalogId, newBillingCycle, requestedStudentCount);
  return quote;
}

export interface ApplyPlanChangeResult extends PlanChangeQuote {
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  mock?: boolean;
}

/** Tenant-facing subscribe/upgrade/downgrade: creates a Razorpay order for
 *  the prorated+penalty-adjusted amount. The actual plan switch happens in
 *  `confirmPlanChange` once payment is verified — never before, so a
 *  tenant is never left on a new plan without having paid the difference. */
export async function requestPlanChange(
  tenantId: number,
  newPlanCatalogId: number,
  newBillingCycle: 'monthly' | 'quarterly' | 'yearly',
  requestedStudentCount?: number
): Promise<ApplyPlanChangeResult> {
  const { quote } = await buildQuote(tenantId, newPlanCatalogId, newBillingCycle, requestedStudentCount);

  const amountPaise = quote.amountDue * 100;

  if (amountPaise === 0) {
    // Fully covered by proration credit — confirm immediately, no payment needed.
    return {
      ...quote,
      orderId: `order_nopay_${Date.now()}`,
      amountPaise: 0,
      currency: 'INR',
      keyId: '',
    };
  }

  if (!env.razorpay.enabled) {
    return {
      ...quote,
      orderId: `order_mock_${Date.now()}`,
      amountPaise,
      currency: 'INR',
      keyId: 'rzp_test_mock',
      mock: true,
    };
  }

  const client = razorpayClient();
  if (!client) throw ApiError.badRequest('RAZORPAY_NOT_CONFIGURED', 'Payment gateway not configured');
  const order = await client.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `planchg_${tenantId}_${Date.now()}`,
    notes: {
      tenantId: String(tenantId),
      newPlanCatalogId: String(newPlanCatalogId),
      newBillingCycle,
      direction: quote.direction,
    },
  });

  return {
    ...quote,
    orderId: order.id,
    amountPaise: Number(order.amount),
    currency: order.currency,
    keyId: env.razorpay.keyId,
  };
}

/** Verifies payment (if any was required) then actually switches the plan,
 *  stamping a fresh billing cycle and proration snapshot. */
export async function confirmPlanChange(
  tenantId: number,
  actorUserId: number,
  newPlanCatalogId: number,
  newBillingCycle: 'monthly' | 'quarterly' | 'yearly',
  payment: { orderId: string; paymentId?: string; signature?: string },
  requestedStudentCount?: number
): Promise<ApplyPlanChangeResult> {
  const { quote } = await buildQuote(tenantId, newPlanCatalogId, newBillingCycle, requestedStudentCount);

  if (quote.amountDue > 0 && !payment.orderId.startsWith('order_nopay_')) {
    if (env.razorpay.enabled) {
      const expected = crypto
        .createHmac('sha256', env.razorpay.secret)
        .update(`${payment.orderId}|${payment.paymentId}`)
        .digest('hex');
      if (expected !== payment.signature) {
        throw ApiError.badRequest('INVALID_SIGNATURE', 'Payment signature verification failed');
      }
    } else if (!payment.orderId.startsWith('order_mock_')) {
      throw ApiError.badRequest('RAZORPAY_NOT_CONFIGURED', 'Payment gateway not configured');
    }
  }

  const newPlan = await getPlanById(newPlanCatalogId);
  const rateMap = { monthly: newPlan.priceMonthly, quarterly: newPlan.priceQuarterly, yearly: newPlan.priceYearly };
  const newPerStudentRate = rateMap[newBillingCycle];

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE subscriptions
          SET plan_catalog_id = $2,
              plan = 'per_student',
              billing_cycle = $3,
              per_student_rate = $4,
              status = 'active',
              student_count_snapshot = $5,
              amount = $6,
              next_billing_date = now() + ($7 || ' months')::interval,
              current_cycle_started_at = now(),
              current_cycle_amount = $6
        WHERE tenant_id = $1`,
      [
        tenantId,
        newPlanCatalogId,
        newBillingCycle,
        newPerStudentRate,
        quote.studentCount,
        quote.newCycleAmount,
        CYCLE_MONTHS[newBillingCycle] ?? 1,
      ]
    );

    await writeAudit(
      {
        tenantId,
        actorUserId,
        action: quote.direction === 'upgrade' ? 'plan_upgraded' : quote.direction === 'downgrade' ? 'plan_downgraded' : 'plan_resubscribed',
        entity: 'subscription',
        meta: {
          planName: quote.newPlanName,
          billingCycle: newBillingCycle,
          prorationCredit: quote.prorationCredit,
          penaltyAmount: quote.penaltyAmount,
          amountDue: quote.amountDue,
          orderId: payment.orderId,
          paymentId: payment.paymentId ?? null,
        },
      },
      client
    );
  });

  const { rows: subRows } = await query<{ nextBillingDate: Date | null }>(
    `SELECT next_billing_date AS "nextBillingDate" FROM subscriptions WHERE tenant_id = $1`,
    [tenantId]
  );
  await sendSubscriptionReceiptEmail({
    tenantId,
    planName: quote.newPlanName,
    billingCycle: newBillingCycle,
    studentCount: quote.studentCount,
    amountPaidRupees: quote.amountDue,
    prorationCredit: quote.prorationCredit,
    penaltyAmount: quote.penaltyAmount,
    paymentId: payment.paymentId ?? payment.orderId,
    nextBillingDate: subRows[0]?.nextBillingDate ?? null,
  });

  return {
    ...quote,
    orderId: payment.orderId,
    amountPaise: quote.amountDue * 100,
    currency: 'INR',
    keyId: '',
  };
}
