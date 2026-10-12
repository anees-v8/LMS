-- ============================================================
-- Removes "flat rate" billing entirely (Campus only ever sells
-- per-student-per-month pricing across Basic/Pro/Elite x
-- monthly/quarterly/yearly) and adds the columns needed to support
-- a real tenant-facing subscribe/upgrade/downgrade flow:
--   - proration: when a tenant changes plan mid-cycle, we need to know
--     how much of the current cycle's paid amount is still "unused" so
--     it can be credited against the new plan's bill.
--   - downgrade penalty: a superadmin-configurable fixed amount charged
--     only on downgrade (never on upgrade), stored platform-wide since
--     there is exactly one global value, not a per-tenant setting.
--
-- Legacy flat-plan tenants (plan='flat', plan_catalog_id NULL) are
-- migrated onto Basic / per_student / monthly so every tenant has a
-- real plan_catalog_id going forward — there is no more "flat" to fall
-- back to.
-- ============================================================

-- 1. Proration tracking: paid-through date and amount of the *current*
--    billing cycle, snapshotted at the last successful payment. Needed to
--    compute "unused time" credit when a tenant changes plans mid-cycle.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS current_cycle_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_cycle_amount INT;

-- 2. Global, superadmin-configurable settings. Single-row table (id=1
--    enforced) since there is exactly one platform-wide value today;
--    a generic key-value table would be premature for one setting.
CREATE TABLE IF NOT EXISTS platform_settings (
  id INT PRIMARY KEY DEFAULT 1,
  downgrade_penalty_amount INT NOT NULL DEFAULT 500,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_settings_singleton CHECK (id = 1)
);
INSERT INTO platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 3. Migrate legacy flat tenants onto Basic / per_student / monthly so
--    every tenant has a real plan_catalog_id. Basic's current monthly
--    per-student rate (price_monthly) is used as the new per_student_rate;
--    amount is recalculated from the tenant's actual current student count
--    (0 if none yet) rather than left at the old flat amount.
UPDATE subscriptions s
   SET plan = 'per_student',
       plan_catalog_id = (SELECT id FROM plan_catalog WHERE name = 'Basic' LIMIT 1),
       billing_cycle = 'monthly',
       per_student_rate = (SELECT price_monthly FROM plan_catalog WHERE name = 'Basic' LIMIT 1),
       amount = (SELECT price_monthly FROM plan_catalog WHERE name = 'Basic' LIMIT 1)
                * GREATEST((SELECT count(*)::int FROM students WHERE tenant_id = s.tenant_id), 1)
 WHERE s.plan = 'flat';

-- 4. New tenants (registerTenant) must default to per_student from here
--    on — there is no flat tier to assign anymore.
ALTER TABLE subscriptions ALTER COLUMN plan SET DEFAULT 'per_student';
