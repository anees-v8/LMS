import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db';
import env from '../config/env';
import ApiError from '../utils/ApiError';
import { writeAudit } from '../utils/audit';
import { istDayOfWeek } from '../utils/istDate';

export interface RegisterTenantInput {
  name: string;
  slug: string;
  city?: string;
  contactPhone?: string;
  adminName: string;
  adminPhone: string;
  adminEmail: string;
  adminPassword: string;
  plan?: string;
  amount?: number;
}

interface TenantResult {
  id: number;
  name: string;
  slug: string;
  city: string | null;
  contactPhone: string | null;
}

interface AdminResult {
  id: number;
  fullName: string;
  phone: string;
  role: string;
}

/**
 * Onboard a new institute: creates tenant + trial subscription + coaching_admin
 * in a single transaction.
 */
export async function registerTenant(
  input: RegisterTenantInput,
  actorUserId: number | null = null
): Promise<{ tenant: TenantResult; adminUser: AdminResult }> {
  const {
    name,
    slug,
    city,
    contactPhone,
    adminName,
    adminPhone,
    adminEmail,
    adminPassword,
    plan = 'flat',
    amount = env.billing.defaultAmount,
  } = input;

  const hash = await bcrypt.hash(adminPassword, 10);

  return withTransaction(async (client) => {
    const existing = await client.query(`SELECT 1 FROM tenants WHERE slug = $1`, [slug]);
    if (existing.rowCount) throw ApiError.conflict('SLUG_TAKEN', 'This slug is already in use');

    const emailTaken = await client.query(`SELECT 1 FROM users WHERE lower(email) = lower($1)`, [adminEmail]);
    if (emailTaken.rowCount) throw ApiError.conflict('EMAIL_TAKEN', 'This email is already in use by another account');

    const tenant = (
      await client.query<TenantResult>(
        `INSERT INTO tenants (name, slug, city, contact_phone)
       VALUES ($1,$2,$3,$4)
       RETURNING id, name, slug, city, contact_phone AS "contactPhone"`,
        [name, slug, city || null, contactPhone || null]
      )
    ).rows[0];

    await client.query(
      `INSERT INTO subscriptions (tenant_id, plan, amount, status, trial_ends_at)
       VALUES ($1,$2,$3,'trial', now() + ($4 || ' days')::interval)`,
      [tenant.id, plan, amount, env.billing.trialDays]
    );

    const admin = (
      await client.query<AdminResult>(
        `INSERT INTO users (tenant_id, role, full_name, phone, email, password_hash)
       VALUES ($1,'coaching_admin',$2,$3,$4,$5)
       RETURNING id, full_name AS "fullName", phone, role`,
        [tenant.id, adminName, adminPhone, adminEmail, hash]
      )
    ).rows[0];

    await writeAudit(
      {
        tenantId: tenant.id,
        actorUserId,
        action: 'tenant_created',
        entity: 'tenant',
        entityId: tenant.id,
        meta: { name: tenant.name, slug: tenant.slug, adminPhone },
      },
      client
    );

    return { tenant, adminUser: admin };
  });
}

export interface TenantListItem {
  id: number;
  name: string;
  slug: string;
  city: string | null;
  isActive: boolean;
  status: string | null;
  trialEndsAt: Date | null;
  nextBillingDate: Date | null;
  studentCount: number;
  teacherCount: number;
  batchCount: number;
  createdAt: Date;
}

export async function listTenants(): Promise<TenantListItem[]> {
  const { rows } = await query<TenantListItem>(`
    SELECT t.id, t.name, t.slug, t.city, t.is_active AS "isActive", t.created_at AS "createdAt",
           s.status, s.trial_ends_at AS "trialEndsAt", s.next_billing_date AS "nextBillingDate",
           (SELECT count(*)::int FROM students st WHERE st.tenant_id = t.id) AS "studentCount",
           (SELECT count(*)::int FROM users u WHERE u.tenant_id = t.id AND u.role = 'teacher') AS "teacherCount",
           (SELECT count(*)::int FROM batches b WHERE b.tenant_id = t.id) AS "batchCount"
      FROM tenants t
      LEFT JOIN subscriptions s ON s.tenant_id = t.id
      ORDER BY t.created_at DESC
  `);
  return rows;
}

export async function setTenantActive(
  id: number,
  isActive: boolean,
  actorUserId: number | null = null
): Promise<{ id: number; name: string; isActive: boolean }> {
  const { rows } = await query<{ id: number; name: string; isActive: boolean }>(
    `UPDATE tenants SET is_active = $2 WHERE id = $1
     RETURNING id, name, is_active AS "isActive"`,
    [id, isActive]
  );
  if (!rows[0]) throw ApiError.notFound('TENANT_NOT_FOUND');

  await writeAudit({
    tenantId: id,
    actorUserId,
    action: isActive ? 'tenant_activated' : 'tenant_suspended',
    entity: 'tenant',
    entityId: id,
  });

  return rows[0];
}

export interface SubscriptionListItem {
  tenantId: number;
  name: string;
  status: string;
  plan: string;
  amount: number;
  trialEndsAt: Date | null;
  nextBillingDate: Date | null;
}

export async function listSubscriptions(): Promise<SubscriptionListItem[]> {
  const { rows } = await query<SubscriptionListItem>(`
    SELECT s.tenant_id AS "tenantId", t.name, s.status, s.plan, s.amount,
           s.trial_ends_at AS "trialEndsAt", s.next_billing_date AS "nextBillingDate"
      FROM subscriptions s JOIN tenants t ON t.id = s.tenant_id
      ORDER BY s.created_at DESC
  `);
  return rows;
}

export interface ExpiringItem {
  tenantId: number;
  name: string;
  status: string;
  trialEndsAt: Date | null;
}

export async function expiringSoon(days = 3): Promise<ExpiringItem[]> {
  const { rows } = await query<ExpiringItem>(
    `SELECT s.tenant_id AS "tenantId", t.name, s.status, s.trial_ends_at AS "trialEndsAt"
       FROM subscriptions s JOIN tenants t ON t.id = s.tenant_id
      WHERE s.status = 'trial'
        AND s.trial_ends_at IS NOT NULL
        AND s.trial_ends_at <= now() + ($1 || ' days')::interval
        AND s.trial_ends_at >= now()
      ORDER BY s.trial_ends_at ASC`,
    [days]
  );
  return rows;
}

export interface GraphDataPoint {
  day: number;
  institutes: number;
  students: number;
  revenue: number;
}

export interface PlatformAnalytics {
  totalTenants: number;
  activeTenants: number;
  totalStudents: number;
  mrr: number;
  onTrial: number;
  growthTotalTenants: string;
  growthTotalStudents: string;
  growthActiveTenants: string;
  growthRevenue: string;
  graphData: GraphDataPoint[];
}

export async function analytics(month?: number, year?: number): Promise<PlatformAnalytics> {
  const targetDate = new Date();
  if (year) targetDate.setFullYear(year);
  if (month) targetDate.setMonth(month - 1); // month is 1-indexed

  const startStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-01`;
  const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0); // Last day of month
  const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  const lastMonthStart = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
  const lastMonthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0);
  const lastMonthStartStr = `${lastMonthStart.getFullYear()}-${String(lastMonthStart.getMonth() + 1).padStart(2, '0')}-01`;
  const lastMonthEndStr = `${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(lastMonthEnd.getDate()).padStart(2, '0')} 23:59:59`;

  const endStrFull = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')} 23:59:59`;

  const { rows } = await query<Omit<PlatformAnalytics, 'graphData'>>(`
    SELECT
      (SELECT count(*)::int FROM tenants) AS "totalTenants",
      (SELECT count(*)::int FROM tenants WHERE is_active) AS "activeTenants",
      (SELECT count(*)::int FROM students) AS "totalStudents",
      (SELECT COALESCE(sum(amount),0)::int FROM subscriptions WHERE status = 'active') AS "mrr",
      (SELECT count(*)::int FROM subscriptions WHERE status = 'trial') AS "onTrial"
  `);

  const { rows: growthRows } = await query(`
    SELECT
      (SELECT count(*)::int FROM tenants WHERE created_at >= $1 AND created_at <= $2) AS "thisMonthTenants",
      (SELECT count(*)::int FROM students WHERE joined_at >= $1 AND joined_at <= $2) AS "thisMonthStudents",
      (SELECT count(*)::int FROM students WHERE joined_at >= $3 AND joined_at <= $4) AS "lastMonthStudents",
      (SELECT count(*)::int FROM tenants WHERE is_active = true AND created_at >= $1 AND created_at <= $2) AS "thisMonthActiveTenants",
      (SELECT count(*)::int FROM tenants WHERE is_active = true AND created_at >= $3 AND created_at <= $4) AS "lastMonthActiveTenants",
      (SELECT COALESCE(sum(amount),0)::int FROM subscriptions WHERE status = 'active' AND created_at >= $1 AND created_at <= $2) AS "thisMonthRevenue",
      (SELECT COALESCE(sum(amount),0)::int FROM subscriptions WHERE status = 'active' AND created_at >= $3 AND created_at <= $4) AS "lastMonthRevenue"
  `, [startStr, endStrFull, lastMonthStartStr, lastMonthEndStr]);

  const growth = growthRows[0];
  const growthTotalTenants = `${growth.thisMonthTenants >= 0 ? '+' : ''}${growth.thisMonthTenants} this month`;

  const calcPercent = (curr: number, prev: number) => prev > 0 ? Math.round(((curr - prev) / prev) * 100) : (curr > 0 ? 100 : 0);
  const studentGrowth = calcPercent(growth.thisMonthStudents, growth.lastMonthStudents);
  const activeTenantGrowth = calcPercent(growth.thisMonthActiveTenants, growth.lastMonthActiveTenants);
  const revenueGrowth = calcPercent(growth.thisMonthRevenue, growth.lastMonthRevenue);

  const graphRes = await query<GraphDataPoint>(`
    SELECT
      EXTRACT(DAY FROM d.day)::int as day,
      (SELECT count(*)::int FROM tenants WHERE created_at <= d.day + interval '1 day' - interval '1 second') as institutes,
      (SELECT count(*)::int FROM students WHERE joined_at <= (d.day)::date) as students,
      (SELECT COALESCE(sum(amount),0)::int FROM subscriptions WHERE status = 'active' AND created_at <= d.day + interval '1 day' - interval '1 second') as revenue
    FROM generate_series(
      $1::date,
      $2::date,
      '1 day'::interval
    ) as d(day)
    ORDER BY day ASC
  `, [startStr, endStr]);

  return {
    ...rows[0],
    growthTotalTenants,
    growthTotalStudents: `${studentGrowth >= 0 ? '+' : ''}${studentGrowth}% this month`,
    growthActiveTenants: `${activeTenantGrowth >= 0 ? '+' : ''}${activeTenantGrowth}% this month`,
    growthRevenue: `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth}% this month`,
    graphData: graphRes.rows,
  };
}

export interface TenantDashboardOverview {
  totalStudents: number;
  studentsGrowth: number;
  totalTeachers: number;
  teachersGrowth: number;
  feesCollected: number;
  feesCollectedGrowth: number;
  feesPending: number;
  feesPendingGrowth: number;
}

export interface TenantDashboardResponse {
  overview: TenantDashboardOverview;
  studentChart: { day: string; count: number }[];
  feesChart: { collected: number; pending: number };
  upcomingSchedule: any[];
}

export async function getTenantDashboard(tenantId: number, month?: number, year?: number): Promise<TenantDashboardResponse> {
  const d = new Date();
  const targetYear = year || d.getFullYear();
  const targetMonth = month || (d.getMonth() + 1); // 1-12

  const startDateStr = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-01`;
  const nextMonth = targetMonth === 12 ? 1 : targetMonth + 1;
  const nextMonthYear = targetMonth === 12 ? targetYear + 1 : targetYear;
  const endDateStr = `${nextMonthYear}-${nextMonth.toString().padStart(2, '0')}-01`;

  const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
  const prevMonthYear = targetMonth === 1 ? targetYear - 1 : targetYear;
  const lastMonthStartDateStr = `${prevMonthYear}-${prevMonth.toString().padStart(2, '0')}-01`;

  const { rows } = await query(`
    SELECT
      (SELECT count(*)::int FROM students WHERE tenant_id = $1 AND joined_at < $3::date) AS "totalStudents",
      (SELECT count(*)::int FROM students WHERE tenant_id = $1 AND joined_at >= $2::date AND joined_at < $3::date) AS "studentsThisMonth",
      (SELECT count(*)::int FROM students WHERE tenant_id = $1 AND joined_at >= $4::date AND joined_at < $2::date) AS "studentsLastMonth",
      (SELECT count(*)::int FROM users WHERE tenant_id = $1 AND role = 'teacher' AND created_at < $3::date) AS "totalTeachers",
      (SELECT COALESCE(sum(amount_paid),0)::int FROM fee_payments WHERE tenant_id = $1 AND paid_on < $3::date) AS "feesCollected",
      (SELECT COALESCE(sum(amount_paid),0)::int FROM fee_payments WHERE tenant_id = $1 AND paid_on >= $2::date AND paid_on < $3::date) AS "feesCollectedThisMonth",
      (SELECT COALESCE(sum(amount_paid),0)::int FROM fee_payments WHERE tenant_id = $1 AND paid_on >= $4::date AND paid_on < $2::date) AS "feesCollectedLastMonth",
      (SELECT COALESCE(sum(amount_paid),0)::int FROM fee_payments WHERE tenant_id = $1 AND paid_on < $2::date) AS "feesCollectedBeforeThisMonth",
      (SELECT COALESCE(sum(amount),0)::int FROM fee_dues WHERE tenant_id = $1) AS "totalFees"
  `, [tenantId, startDateStr, endDateStr, lastMonthStartDateStr]);

  const stats = rows[0];
  const feesPending = Math.max(0, stats.totalFees - stats.feesCollected);
  // Pending balance as of the start of this month, i.e. after last month's collections.
  const feesPendingLastMonth = Math.max(0, stats.totalFees - stats.feesCollectedBeforeThisMonth);

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const studentsGrowth = calculateGrowth(stats.studentsThisMonth, stats.studentsLastMonth);
  const feesCollectedGrowth = calculateGrowth(stats.feesCollectedThisMonth, stats.feesCollectedLastMonth);
  const feesPendingGrowth = calculateGrowth(feesPending, feesPendingLastMonth);

  const isCurrentMonth = targetYear === d.getFullYear() && targetMonth === (d.getMonth() + 1);
  const chartEndDate = isCurrentMonth ? "CURRENT_DATE" : "$2::date - interval '1 day'";

  const chartRes = await query<{ day: string; count: number }>(`
    SELECT
      to_char(day_series.day, 'Dy') as day,
      (SELECT count(*)::int FROM students WHERE tenant_id=$1 AND joined_at <= day_series.day + interval '1 day' - interval '1 second') as count
    FROM generate_series((${chartEndDate}) - interval '6 days', (${chartEndDate}), '1 day'::interval) as day_series(day)
    ORDER BY day_series.day ASC
  `, isCurrentMonth ? [tenantId] : [tenantId, endDateStr]);

  // LEFT JOINs from batch_schedule since a slot may not have a teacher
  // assigned yet (unlike the old timetable row's required teacher_id).
  const scheduleRes = await query(`
    SELECT
      bs.id,
      bs.start_time as "startTime",
      bs.end_time as "endTime",
      b.name as "batchName",
      s.name as "subjectName",
      u.full_name as "teacherName"
    FROM batch_schedule bs
    JOIN batches b ON b.id = bs.batch_id
    LEFT JOIN subjects s ON s.id = bs.subject_id
    LEFT JOIN teacher_assignments ta ON ta.batch_id = bs.batch_id AND ta.subject_id = bs.subject_id AND ta.tenant_id = bs.tenant_id
    LEFT JOIN users u ON u.id = ta.teacher_user_id
    WHERE bs.tenant_id = $1 AND bs.day_of_week = $2
    ORDER BY bs.start_time ASC
    LIMIT 5
  `, [tenantId, istDayOfWeek()]);

  return {
    overview: {
      totalStudents: stats.totalStudents,
      studentsGrowth: studentsGrowth,
      totalTeachers: stats.totalTeachers,
      teachersGrowth: null as any,
      feesCollected: stats.feesCollected,
      feesCollectedGrowth: feesCollectedGrowth,
      feesPending: feesPending,
      feesPendingGrowth: feesPendingGrowth,
    },
    studentChart: chartRes.rows,
    feesChart: { collected: stats.feesCollectedThisMonth, pending: feesPending },
    upcomingSchedule: scheduleRes.rows
  };
}
