-- ============================================================
-- Batch-Centric Model — Phase 1, Part 2
-- Repoint attendance's optional schedule-slot cross-reference from
-- the (soon to be dropped, see 0030) `timetable` table to the new
-- `batch_schedule` table.
-- ============================================================

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS batch_schedule_id INT REFERENCES batch_schedule(id);
ALTER TABLE attendance DROP COLUMN IF EXISTS timetable_id;

ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS batch_schedule_id INT REFERENCES batch_schedule(id);
ALTER TABLE attendance_sessions DROP COLUMN IF EXISTS timetable_id;
