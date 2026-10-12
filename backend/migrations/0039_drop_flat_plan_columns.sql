-- ============================================================
-- Flat-rate billing is fully retired (0038 migrated every tenant onto
-- per_student). flat_price_monthly / flat_student_limit on plan_catalog
-- were only ever read by the now-removed "flat" branch of
-- assignPlanToTenant() and the superadmin plan editor — nothing else
-- references them. Dropping them (rather than leaving unused NOT NULL
-- columns behind) so createPlan()/updatePlan() don't need to keep
-- inserting meaningless placeholder values.
--
-- flat_teacher_limit is NOT touched here — despite its name, it is the
-- live per-tier teacher cap used by both billing modes (see 0037).
-- ============================================================

ALTER TABLE plan_catalog
  DROP COLUMN IF EXISTS flat_price_monthly,
  DROP COLUMN IF EXISTS flat_student_limit;
