-- ============================================================
-- Adds a soft-delete flag to batches, mirroring how teachers/students are
-- "removed" (users.is_active). A batch almost always has real dependent
-- records once it's in use (enrollments, attendance, fee_structures,
-- timetable, live_classes) and several of those foreign keys are NOT NULL
-- with no cascade — a hard DELETE on a batch with any such record fails
-- with a Postgres FK-violation (23503). Deactivating instead hides the
-- batch from the active roster while keeping every historical record
-- intact. An empty batch (never enrolled anyone) can still be hard-deleted
-- safely, which the admin UI offers separately.
-- ============================================================

ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
