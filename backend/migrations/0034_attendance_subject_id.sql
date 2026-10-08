-- ============================================================
-- Add subject_id to attendance's identity.
--
-- Previously UNIQUE(student_id, date, batch_id) meant a batch with 2+
-- subjects scheduled the same day would overwrite one subject's
-- attendance when the other subject's attendance was marked for the
-- same student/date/batch (identical conflict target). This makes
-- subject_id part of both the row and the unique key so each
-- subject's attendance for a given student/date/batch is its own row.
--
-- Backfill: batch_schedule_id (when set) already identifies a subject
-- via batch_schedule.subject_id. Rows with no batch_schedule_id (QR
-- scans never set one) fall back to the batch's subject_ids — correct
-- as long as that batch teaches exactly one subject, which is true for
-- every existing row; a batch with 2+ subjects and an existing
-- batch_schedule_id-less row would need manual review, flagged by the
-- verification gate below rather than silently guessed at.
-- ============================================================

ALTER TABLE attendance ADD COLUMN subject_id INT REFERENCES subjects(id);

UPDATE attendance a SET subject_id = bs.subject_id
  FROM batch_schedule bs WHERE bs.id = a.batch_schedule_id;

UPDATE attendance a SET subject_id = b.subject_ids[1]
  FROM batches b
 WHERE b.id = a.batch_id AND a.subject_id IS NULL AND array_length(b.subject_ids, 1) = 1;

-- Verification gate: every row must have resolved to a subject before
-- the column becomes NOT NULL — a row that didn't (multi-subject batch,
-- no schedule link) would otherwise silently become NULL forever.
DO $$
DECLARE unresolved INT;
BEGIN
  SELECT count(*) INTO unresolved FROM attendance WHERE subject_id IS NULL;
  IF unresolved > 0 THEN
    RAISE EXCEPTION '% attendance row(s) could not be resolved to a subject during backfill', unresolved;
  END IF;
END $$;

ALTER TABLE attendance ALTER COLUMN subject_id SET NOT NULL;

ALTER TABLE attendance DROP CONSTRAINT attendance_student_id_date_batch_id_key;
ALTER TABLE attendance ADD CONSTRAINT attendance_student_id_date_batch_id_subject_id_key
  UNIQUE (student_id, date, batch_id, subject_id);

-- ---------- QR SESSIONS: subject_id ----------
-- A QR session is now opened for one specific subject (teacher-authority
-- check in createQrAttendanceSession needs it), not just a batch.
ALTER TABLE attendance_sessions ADD COLUMN subject_id INT REFERENCES subjects(id);

UPDATE attendance_sessions s SET subject_id = bs.subject_id
  FROM batch_schedule bs WHERE bs.id = s.batch_schedule_id;

UPDATE attendance_sessions s SET subject_id = b.subject_ids[1]
  FROM batches b
 WHERE b.id = s.batch_id AND s.subject_id IS NULL AND array_length(b.subject_ids, 1) = 1;

DO $$
DECLARE unresolved INT;
BEGIN
  SELECT count(*) INTO unresolved FROM attendance_sessions WHERE subject_id IS NULL;
  IF unresolved > 0 THEN
    RAISE EXCEPTION '% attendance_sessions row(s) could not be resolved to a subject during backfill', unresolved;
  END IF;
END $$;

ALTER TABLE attendance_sessions ALTER COLUMN subject_id SET NOT NULL;
