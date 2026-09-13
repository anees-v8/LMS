-- ============================================================
-- Batch-Centric Model — Phase 1, Part 3
-- `timetable` is fully replaced by `batch_schedule` (recurring
-- weekly slots) + `teacher_assignments` (which teacher covers which
-- batch+subject). Both FK references into timetable (attendance,
-- attendance_sessions) were already repointed in 0029, so this is
-- now a safe drop.
-- ============================================================

DROP INDEX IF EXISTS idx_timetable_tenant_day;
DROP TABLE IF EXISTS timetable;
