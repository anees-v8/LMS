import { query } from '../db';
import ApiError from '../utils/ApiError';
import { writeAudit } from '../utils/audit';

export interface PlanCatalogItem {
  id: number;
  name: string;
  tagline: string | null;
  priceMonthly: number;
  priceQuarterly: number;
  priceYearly: number;
  flatTeacherLimit: number;
  features: string[];
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlanInput {
  name: string;
  tagline?: string;
  priceMonthly: number;
  priceQuarterly: number;
  priceYearly: number;
  flatTeacherLimit: number;
  features: string[];
  displayOrder?: number;
}

export interface UpdatePlanInput {
  tagline?: string;
  priceMonthly?: number;
  priceQuarterly?: number;
  priceYearly?: number;
  flatTeacherLimit?: number;
  features?: string[];
  isActive?: boolean;
  displayOrder?: number;
}

/** List all plans (Super Admin sees all; public endpoint sees only active) */
export async function listPlans(activeOnly = false): Promise<PlanCatalogItem[]> {
  const where = activeOnly ? 'WHERE is_active = true' : '';
  const { rows } = await query<PlanCatalogItem>(
    `SELECT id, name, tagline,
            price_monthly AS "priceMonthly",
            price_quarterly AS "priceQuarterly",
            price_yearly AS "priceYearly",
            flat_teacher_limit AS "flatTeacherLimit",
            features,
            is_active AS "isActive",
            display_order AS "displayOrder",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
       FROM plan_catalog
       ${where}
       ORDER BY display_order ASC, id ASC`
  );
  return rows;
}

/** Get single plan by id */
export async function getPlanById(id: number): Promise<PlanCatalogItem> {
  const { rows } = await query<PlanCatalogItem>(
    `SELECT id, name, tagline,
            price_monthly AS "priceMonthly",
            price_quarterly AS "priceQuarterly",
            price_yearly AS "priceYearly",
            flat_teacher_limit AS "flatTeacherLimit",
            features,
            is_active AS "isActive",
            display_order AS "displayOrder",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
       FROM plan_catalog WHERE id = $1`,
    [id]
  );
  if (!rows[0]) throw ApiError.notFound('PLAN_NOT_FOUND', `Plan with id ${id} not found`);
  return rows[0];
}

/** Create a new plan (Super Admin only) */
export async function createPlan(
  input: CreatePlanInput,
  actorUserId: number | null = null
): Promise<PlanCatalogItem> {
  const { name, tagline, priceMonthly, priceQuarterly, priceYearly, flatTeacherLimit, features, displayOrder = 0 } = input;

  const { rows } = await query<PlanCatalogItem>(
    `INSERT INTO plan_catalog
       (name, tagline, price_monthly, price_quarterly, price_yearly, flat_teacher_limit, features, display_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
     RETURNING id, name, tagline,
               price_monthly AS "priceMonthly",
               price_quarterly AS "priceQuarterly",
               price_yearly AS "priceYearly",
               flat_teacher_limit AS "flatTeacherLimit",
               features,
               is_active AS "isActive",
               display_order AS "displayOrder",
               created_at AS "createdAt",
               updated_at AS "updatedAt"`,
    [name, tagline ?? null, priceMonthly, priceQuarterly, priceYearly, flatTeacherLimit, JSON.stringify(features), displayOrder]
  );

  await writeAudit({
    tenantId: null,
    actorUserId,
    action: 'plan_created',
    entity: 'plan_catalog',
    entityId: rows[0].id,
    meta: { name },
  });

  return rows[0];
}

/** Update an existing plan (Super Admin only) */
export async function updatePlan(
  id: number,
  input: UpdatePlanInput,
  actorUserId: number | null = null
): Promise<PlanCatalogItem> {
  // Build dynamic SET clause — only update provided fields
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (input.tagline !== undefined)         { setClauses.push(`tagline = $${paramIdx++}`);            values.push(input.tagline); }
  if (input.priceMonthly !== undefined)    { setClauses.push(`price_monthly = $${paramIdx++}`);      values.push(input.priceMonthly); }
  if (input.priceQuarterly !== undefined)  { setClauses.push(`price_quarterly = $${paramIdx++}`);    values.push(input.priceQuarterly); }
  if (input.priceYearly !== undefined)     { setClauses.push(`price_yearly = $${paramIdx++}`);       values.push(input.priceYearly); }
  if (input.flatTeacherLimit !== undefined){ setClauses.push(`flat_teacher_limit = $${paramIdx++}`); values.push(input.flatTeacherLimit); }
  if (input.features !== undefined)        { setClauses.push(`features = $${paramIdx++}::jsonb`);    values.push(JSON.stringify(input.features)); }
  if (input.isActive !== undefined)        { setClauses.push(`is_active = $${paramIdx++}`);          values.push(input.isActive); }
  if (input.displayOrder !== undefined)    { setClauses.push(`display_order = $${paramIdx++}`);     values.push(input.displayOrder); }

  if (setClauses.length === 0) throw ApiError.badRequest('NO_CHANGES', 'No fields to update');

  values.push(id);
  const { rows } = await query<PlanCatalogItem>(
    `UPDATE plan_catalog SET ${setClauses.join(', ')}
      WHERE id = $${paramIdx}
      RETURNING id, name, tagline,
                price_monthly AS "priceMonthly",
                price_quarterly AS "priceQuarterly",
                price_yearly AS "priceYearly",
                flat_teacher_limit AS "flatTeacherLimit",
                features,
                is_active AS "isActive",
                display_order AS "displayOrder",
                created_at AS "createdAt",
                updated_at AS "updatedAt"`,
    values
  );
  if (!rows[0]) throw ApiError.notFound('PLAN_NOT_FOUND');

  await writeAudit({
    tenantId: null,
    actorUserId,
    action: 'plan_updated',
    entity: 'plan_catalog',
    entityId: id,
    meta: input as Record<string, unknown>,
  });

  return rows[0];
}

/** Deactivate (soft-delete) a plan — existing subscribers keep their plan */
export async function deactivatePlan(
  id: number,
  actorUserId: number | null = null
): Promise<{ id: number; name: string; isActive: boolean }> {
  const { rows } = await query<{ id: number; name: string; isActive: boolean }>(
    `UPDATE plan_catalog SET is_active = false WHERE id = $1
     RETURNING id, name, is_active AS "isActive"`,
    [id]
  );
  if (!rows[0]) throw ApiError.notFound('PLAN_NOT_FOUND');

  await writeAudit({
    tenantId: null,
    actorUserId,
    action: 'plan_deactivated',
    entity: 'plan_catalog',
    entityId: id,
  });

  return rows[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Subscription Plan Management
// ─────────────────────────────────────────────────────────────────────────────

export interface TenantSubscriptionDetail {
  tenantId: number;
  tenantName: string;
  status: string;
  planId: number | null;
  planName: string | null;
  billingCycle: string;
  perStudentRate: number | null;
  studentCountSnapshot: number | null;
  amount: number;
  trialEndsAt: Date | null;
  nextBillingDate: Date | null;
}

/** Get full subscription detail for a specific tenant */
export async function getTenantSubscription(tenantId: number): Promise<TenantSubscriptionDetail> {
  const { rows } = await query<TenantSubscriptionDetail>(
    `SELECT s.tenant_id AS "tenantId", t.name AS "tenantName",
            s.status, s.plan_catalog_id AS "planId", pc.name AS "planName",
            s.billing_cycle AS "billingCycle",
            s.per_student_rate AS "perStudentRate",
            s.student_count_snapshot AS "studentCountSnapshot",
            s.amount,
            s.trial_ends_at AS "trialEndsAt",
            s.next_billing_date AS "nextBillingDate"
       FROM subscriptions s
       JOIN tenants t ON t.id = s.tenant_id
       LEFT JOIN plan_catalog pc ON pc.id = s.plan_catalog_id
      WHERE s.tenant_id = $1`,
    [tenantId]
  );
  if (!rows[0]) throw ApiError.notFound('SUBSCRIPTION_NOT_FOUND');
  return rows[0];
}

export interface AssignPlanInput {
  planCatalogId: number;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
}

/** Super Admin override: assigns / changes a tenant's plan and billing cycle
 *  directly, with no proration or penalty — use the tenant-facing
 *  upgrade/downgrade flow (subscription.service.ts) for that. This is for
 *  support/manual-correction use only. */
export async function assignPlanToTenant(
  tenantId: number,
  input: AssignPlanInput,
  actorUserId: number | null = null
): Promise<TenantSubscriptionDetail> {
  const plan = await getPlanById(input.planCatalogId);

  const rateMap = {
    monthly: plan.priceMonthly,
    quarterly: plan.priceQuarterly,
    yearly: plan.priceYearly,
  };
  const perStudentRate = rateMap[input.billingCycle];

  await query(
    `UPDATE subscriptions
        SET plan_catalog_id = $2,
            plan = 'per_student',
            billing_cycle = $3,
            per_student_rate = $4
      WHERE tenant_id = $1`,
    [tenantId, input.planCatalogId, input.billingCycle, perStudentRate]
  );

  await writeAudit({
    tenantId,
    actorUserId,
    action: 'plan_assigned',
    entity: 'subscription',
    meta: { planName: plan.name, billingCycle: input.billingCycle },
  });

  return getTenantSubscription(tenantId);
}
