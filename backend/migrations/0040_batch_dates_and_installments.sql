-- ============================================================
-- Adds batch start/end dates and replaces the monthly/quarterly/yearly
-- "billing_cycle" fee model with an explicit installment count.
--
-- Why: billing_cycle conflated "how many times the student pays" with a
-- calendar-period name, which produced a real bug — a 'yearly' batch
-- (CYCLE_PERIODS.yearly = 1) generated a SINGLE due-date, and if the
-- tenant's fee_due_day for the current month had already passed at
-- enrollment time, the due-date generator jumped a full 12 months ahead
-- instead of ~1 (the logic that's correct for monthly/quarterly). A
-- student enrolling on Oct 10 with fee_due_day=5 got billed in Oct 2027,
-- not 2026.
--
-- installment_count fixes this at the model level: due-dates are spaced
-- evenly across the batch's own start_date -> end_date (or a sane default
-- span if end_date is unset), never derived from "has this month's due-day
-- passed" — so there's no 12-month jump possible.
--
-- start_date is backfilled from created_at for existing batches (best
-- available approximation); end_date stays NULL (open-ended) until an
-- admin sets one explicitly.
-- ============================================================

ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS installment_count INT;

UPDATE batches SET start_date = created_at::date WHERE start_date IS NULL;

-- Carry over the old billing_cycle's period count 1:1 so existing batches'
-- fee templates keep billing the same number of times as before.
UPDATE batches SET installment_count = CASE billing_cycle
  WHEN 'monthly' THEN 12
  WHEN 'quarterly' THEN 4
  WHEN 'yearly' THEN 1
  ELSE NULL
END
WHERE installment_count IS NULL AND billing_cycle IS NOT NULL;

ALTER TABLE batches ALTER COLUMN start_date SET NOT NULL;

-- billing_cycle is fully superseded by installment_count — nothing else
-- reads it after this migration's accompanying code change ships. Its
-- pairing CHECK is dropped with it and replaced by the equivalent pairing
-- against installment_count.
ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_fee_amount_cycle_pair;
ALTER TABLE batches DROP COLUMN IF EXISTS billing_cycle;

ALTER TABLE batches ADD CONSTRAINT batches_fee_amount_installments_pair
  CHECK ((fee_amount IS NULL) = (installment_count IS NULL));
ALTER TABLE batches ADD CONSTRAINT batches_installment_count_check
  CHECK (installment_count IS NULL OR installment_count BETWEEN 1 AND 12);
ALTER TABLE batches ADD CONSTRAINT batches_end_date_after_start
  CHECK (end_date IS NULL OR end_date >= start_date);
