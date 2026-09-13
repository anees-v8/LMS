-- ============================================================
-- Batch-Centric Model — Phase 1, Part 4
-- Per-student fee dues replace the batch-shared `fee_structures`
-- model. Each enrolled student gets their own generated due
-- schedule (split from the batch's fee_amount/billing_cycle, or a
-- student-specific override total), so amounts and payment status
-- are always accurate per student instead of a shared proxy.
-- ============================================================

CREATE TABLE IF NOT EXISTS fee_dues (
  id           SERIAL PRIMARY KEY,
  tenant_id    INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id   INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  batch_id     INT NOT NULL REFERENCES batches(id),
  title        VARCHAR(100) NOT NULL,
  amount       INT NOT NULL CHECK (amount >= 0),
  due_date     DATE NOT NULL,
  period_index SMALLINT NOT NULL CHECK (period_index >= 1),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, batch_id, period_index)
);

CREATE INDEX IF NOT EXISTS idx_fee_dues_tenant_student  ON fee_dues(tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_fee_dues_tenant_due_date ON fee_dues(tenant_id, due_date);

-- ---------- FEE PAYMENTS: link to a specific due, drop old link ----------
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS fee_due_id INT REFERENCES fee_dues(id);
ALTER TABLE fee_payments DROP COLUMN IF EXISTS fee_structure_id;

-- ---------- Retire the batch-shared fee template table ----------
DROP TABLE IF EXISTS fee_structures;

-- ---------- STUDENTS: optional per-student fee override ----------
-- A total amount (same semantics as batches.fee_amount) that this
-- student's fee_dues are generated from instead of the batch default,
-- split by the batch's billing_cycle the same way. NULL = use the
-- batch's default fee_amount.
ALTER TABLE students ADD COLUMN IF NOT EXISTS fee_override_amount INT NULL
  CHECK (fee_override_amount IS NULL OR fee_override_amount >= 0);
