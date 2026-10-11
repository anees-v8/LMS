-- ============================================================
-- Chapters move from subjects.chapters (global per subject) to a new
-- batch_subject_chapters table (per batch+subject). Reason: a subject
-- is a tenant-wide tag ("Maths") shared across unrelated batches/grades
-- (Class 5 "Maths" and Class 10 "Maths" would otherwise share the exact
-- same chapter list, which is wrong — their curricula are unrelated).
-- Standard LMS pattern: Subject = pure catalog tag, curriculum lives on
-- the batch-subject "offering", matching the (batch_id, subject_id)
-- junction shape batch_schedule/teacher_assignments already use.
--
-- No backfill: the only existing chapter data (1 chapter, 1 content row
-- in production) is discarded per explicit instruction — this feature
-- is new enough that nothing of value is lost, and a clean cutover is
-- simpler and safer than a backfill heuristic for a single test row.
-- ============================================================

-- Any content filed under the one chapter being dropped would otherwise
-- dangle (chapter_id has no FK — see migration 0033) pointing at an id
-- that no longer exists anywhere.
DELETE FROM content WHERE chapter_id IS NOT NULL;

ALTER TABLE subjects DROP COLUMN chapters;

CREATE TABLE IF NOT EXISTS batch_subject_chapters (
  id         SERIAL PRIMARY KEY,
  tenant_id  INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  batch_id   INT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  subject_id INT NOT NULL REFERENCES subjects(id),
  chapters   JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (batch_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_batch_subject_chapters_tenant_batch ON batch_subject_chapters(tenant_id, batch_id);
