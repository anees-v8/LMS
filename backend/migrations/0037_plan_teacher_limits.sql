-- ============================================================
-- Adds a per-tier teacher cap, same shape as 0026's flat_student_limit.
-- Replaces the previously hardcoded, disconnected Basic=0/Pro=3/Elite=15
-- numbers inside createTeacher() — those were never configurable from
-- the plan editor and silently broke for any tenant not linked to a
-- plan_catalog row (old flat-plan tenants defaulted to "Basic" => 0,
-- blocking teacher creation regardless of what they actually pay for).
-- 'teacher_accounts' is dropped from Basic/Pro/Elite's features array —
-- it's now fully superseded by this numeric limit (0 = not allowed, same
-- as the old feature-gate's effect on Basic/Pro, but configurable
-- instead of hardcoded, and Pro tenants can now have teachers at all).
-- ============================================================

ALTER TABLE plan_catalog
  ADD COLUMN IF NOT EXISTS flat_teacher_limit INT;

UPDATE plan_catalog SET flat_teacher_limit = 1  WHERE name = 'Basic';
UPDATE plan_catalog SET flat_teacher_limit = 5  WHERE name = 'Pro';
UPDATE plan_catalog SET flat_teacher_limit = 20 WHERE name = 'Elite';

-- Any other plan a super_admin created since launch: default to 3 so
-- nothing is left NULL (super_admin can adjust it from the plan editor).
UPDATE plan_catalog
   SET flat_teacher_limit = 3
 WHERE flat_teacher_limit IS NULL;

ALTER TABLE plan_catalog
  ALTER COLUMN flat_teacher_limit SET NOT NULL;

UPDATE plan_catalog
   SET features = features - 'teacher_accounts'
 WHERE features ? 'teacher_accounts';
