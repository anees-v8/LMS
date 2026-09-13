-- ============================================================
-- Batch-Centric Model — Phase 1, Part 1
-- Batch becomes the master template: fee + weekly recurring
-- schedule are configured once on the batch, and teachers attach
-- to a batch+subject explicitly instead of implicitly via a
-- timetable row (see 0030 for the timetable table drop).
-- ============================================================

-- ---------- BATCHES: fee template fields ----------
ALTER TABLE batches ADD COLUMN IF NOT EXISTS fee_amount INT NULL
  CHECK (fee_amount IS NULL OR fee_amount >= 0);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS billing_cycle billing_cycle NULL;
ALTER TABLE batches ADD CONSTRAINT batches_fee_amount_cycle_pair
  CHECK ((fee_amount IS NULL) = (billing_cycle IS NULL));

-- ---------- TENANTS: default fee due-day ----------
-- Drives every batch's generated fee_dues due-dates for that tenant
-- (e.g. 5 = "5th of every month/quarter/year"). Capped at 28 so it
-- stays valid across every month including February.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS fee_due_day SMALLINT NOT NULL DEFAULT 5
  CHECK (fee_due_day BETWEEN 1 AND 28);

-- ---------- BATCH SCHEDULE (recurring weekly template) ----------
-- Replaces `timetable` as the source of a batch's weekly class slots.
-- No date column — this is a repeating template, matched against
-- day_of_week the same way `timetable` already worked.
CREATE TABLE IF NOT EXISTS batch_schedule (
  id          SERIAL PRIMARY KEY,
  tenant_id   INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  batch_id    INT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  subject_id  INT NOT NULL REFERENCES subjects(id),
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun .. 6=Sat
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_batch_schedule_tenant_batch ON batch_schedule(tenant_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_schedule_tenant_day   ON batch_schedule(tenant_id, day_of_week);

-- ---------- TEACHER ASSIGNMENTS ----------
-- A teacher's schedule is derived by joining this table to
-- batch_schedule on (batch_id, subject_id). Replaces the old implicit
-- teacher-batch link that only existed via timetable.teacher_id.
CREATE TABLE IF NOT EXISTS teacher_assignments (
  id              SERIAL PRIMARY KEY,
  tenant_id       INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  batch_id        INT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  subject_id      INT NOT NULL REFERENCES subjects(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_user_id, batch_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_tenant_teacher ON teacher_assignments(tenant_id, teacher_user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_batch_subject  ON teacher_assignments(tenant_id, batch_id, subject_id);
