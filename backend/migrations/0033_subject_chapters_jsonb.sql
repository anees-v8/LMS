-- ============================================================
-- Collapse the standalone `chapters` table into `subjects.chapters`
-- (JSONB). Chapters are never queried independently of their parent
-- subject, and the normalized table bought nothing — same rationale
-- as 0014_stage4_tests_jsonb.sql. This also retires `total_chapters`
-- (a hand-typed "planned" count that silently drifted from the real
-- chapter list) in favor of this being the single, live source of
-- truth: chapters.length IS the chapter count, always accurate.
--
-- content.chapter_id previously had ON DELETE CASCADE against
-- chapters(id); since chapters no longer live in their own table,
-- that FK is dropped — chapter_id is now a plain id matching an
-- element inside the owning subject's chapters JSONB array. Content
-- orphaned by a chapter being removed from the array is handled in
-- application code (see admin.service.ts updateSubject), not by the
-- database, the same way JSONB-array membership can't be enforced by
-- an FK anywhere else in this schema either.
-- ============================================================

ALTER TABLE subjects ADD COLUMN chapters JSONB NOT NULL DEFAULT '[]';

UPDATE subjects s SET chapters = COALESCE((
  SELECT jsonb_agg(jsonb_build_object(
    'id', ch.id,
    'name', ch.name
  ) ORDER BY ch.created_at, ch.id)
  FROM chapters ch WHERE ch.subject_id = s.id
), '[]'::jsonb);

-- Verification gate: every chapter must have been carried across before
-- we touch anything destructive.
DO $$
DECLARE old_count INT; new_count INT;
BEGIN
  SELECT count(*) INTO old_count FROM chapters;
  SELECT COALESCE(SUM(jsonb_array_length(chapters)), 0) INTO new_count FROM subjects;
  IF old_count != new_count THEN
    RAISE EXCEPTION 'chapter count mismatch after JSONB backfill: % old vs % new', old_count, new_count;
  END IF;
END $$;

-- Future chapter ids come from this sequence (tenant-wide unique, so
-- content.chapter_id values stay unambiguous across every subject).
-- Seeded above any id already used by backfilled data.
CREATE SEQUENCE IF NOT EXISTS subject_chapter_id_seq;
SELECT setval('subject_chapter_id_seq', GREATEST(1, (SELECT COALESCE(MAX(id), 0) FROM chapters)));

ALTER TABLE content DROP CONSTRAINT IF EXISTS content_chapter_id_fkey;

DROP TABLE chapters;

ALTER TABLE subjects DROP COLUMN total_chapters;

-- ---------- SUBJECTS: soft-delete flag ----------
-- deleteSubject used to hard-DELETE unconditionally (the one entity in this
-- schema that didn't follow the deleteStudent/deleteTeacher/deleteBatch
-- soft-delete-if-has-dependents pattern). Giving subjects the same
-- is_active flag lets it finally mirror that pattern instead of silently
-- cascading away chapters/content or failing with a raw FK-violation.
ALTER TABLE subjects ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
