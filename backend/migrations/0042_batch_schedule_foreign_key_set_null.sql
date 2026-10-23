-- ============================================================
-- Fix foreign key constraints on attendance and attendance_sessions
-- referencing batch_schedule.
--
-- Previously created without ON DELETE SET NULL (defaulted to NO ACTION).
-- When an admin updates or re-saves a batch's weekly schedule template,
-- deleting the old template slots failed with FK_VIOLATION (23503)
-- "Referenced resource does not exist" if any historical attendance was
-- linked to that slot.
--
-- Setting ON DELETE SET NULL ensures historical attendance records
-- (which have their own date, batch, subject, student, status, marked_by)
-- stay intact, while allowing schedule templates to be updated seamlessly.
-- ============================================================

ALTER TABLE attendance
  DROP CONSTRAINT IF EXISTS attendance_batch_schedule_id_fkey,
  ADD CONSTRAINT attendance_batch_schedule_id_fkey
    FOREIGN KEY (batch_schedule_id) REFERENCES batch_schedule(id) ON DELETE SET NULL;

ALTER TABLE attendance_sessions
  DROP CONSTRAINT IF EXISTS attendance_sessions_batch_schedule_id_fkey,
  ADD CONSTRAINT attendance_sessions_batch_schedule_id_fkey
    FOREIGN KEY (batch_schedule_id) REFERENCES batch_schedule(id) ON DELETE SET NULL;
