import { query, withTransaction } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import * as notificationCenter from './notificationCenter.service.js';
import logger from '../utils/logger.js';
import type { PoolClient } from 'pg';

export interface CreateTestInput {
  title: string;
  batchId?: number;
  subjectId?: number;
  maxMarks?: number;
  testDate?: string;
  validUntil?: string;
  durationMinutes?: number;
  isOnline: boolean;
}

export async function createTest(tenantId: number, data: CreateTestInput) {
  if (data.batchId) {
    const b = await query('SELECT 1 FROM batches WHERE id = $1 AND tenant_id = $2', [data.batchId, tenantId]);
    if (!b.rowCount) throw ApiError.badRequest('INVALID_BATCH');
  }
  if (data.subjectId) {
    const s = await query('SELECT 1 FROM subjects WHERE id = $1 AND tenant_id = $2', [data.subjectId, tenantId]);
    if (!s.rowCount) throw ApiError.badRequest('INVALID_SUBJECT');
  }

  // `test_date` -> `scheduled_at` (TIMESTAMPTZ, so a time-of-day can be set,
  // not just a date). RETURNING re-aliases back to `test_date` so existing
  // clients reading the raw column name keep working unchanged.
  const validUntil = data.validUntil || (data.testDate ? new Date(new Date(data.testDate).getTime() + 24 * 3600_000).toISOString() : null);

  const { rows } = await query(
    `INSERT INTO tests (tenant_id, title, batch_id, subject_id, max_marks, scheduled_at, valid_until, duration_minutes, is_online)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, tenant_id, title, batch_id, subject_id, max_marks,
               scheduled_at AS test_date, valid_until AS valid_until, valid_until AS "validUntil", duration_minutes, is_online`,
    [
      tenantId,
      data.title,
      data.batchId || null,
      data.subjectId || null,
      data.maxMarks || 0,
      data.testDate || null,
      validUntil,
      data.durationMinutes || null,
      data.isOnline,
    ]
  );
  const test = rows[0];

  if (data.batchId && data.testDate) {
    notificationCenter
      .batchStudentUserIds(tenantId, data.batchId)
      .then((userIds) =>
        notificationCenter.sendNotification({
          userIds,
          tenantId,
          title: 'New test scheduled',
          body: `${data.title} — scheduled for ${new Date(data.testDate!).toLocaleString('en-IN')}.`,
          type: 'test_scheduled',
          entityId: test.id,
        })
      )
      .catch((err) => logger.error('Test-scheduled notify failed', { error: err instanceof Error ? err.message : String(err) }));
  }

  return test;
}

export async function listTests(tenantId: number) {
  // Explicit column list (not `t.*`) so `scheduled_at` re-aliases to the
  // `test_date` key the teacher app's raw (unaliased) reads still expect,
  // and `question_count` now counts JSONB array entries, not table rows.
  const { rows } = await query(
    `SELECT t.id, t.tenant_id, t.title, t.batch_id, t.subject_id, t.max_marks,
            t.scheduled_at AS test_date, t.valid_until AS valid_until, t.valid_until AS "validUntil",
            t.duration_minutes, t.is_online,
            b.name as batch_name, s.name as subject_name,
            jsonb_array_length(COALESCE(t.questions, '[]'::jsonb)) as question_count
     FROM tests t
     LEFT JOIN batches b ON b.id = t.batch_id AND b.tenant_id = t.tenant_id
     LEFT JOIN subjects s ON s.id = t.subject_id AND s.tenant_id = t.tenant_id
     WHERE t.tenant_id = $1
     ORDER BY t.id DESC`,
    [tenantId]
  );
  return rows;
}

export interface OptionInput {
  id?: number;
  optionText?: string;
  imageUrl?: string;
  isCorrect: boolean;
}

export interface CreateQuestionInput {
  questionText: string;
  imageUrl?: string;
  marks: number;
  options: OptionInput[];
}

interface StoredOption {
  id: number;
  optionText: string | null;
  imageUrl: string | null;
  isCorrect: boolean;
}

interface StoredQuestion {
  id: number;
  questionText: string;
  imageUrl: string | null;
  marks: number;
  options: StoredOption[];
}

/** Questions are nested inside `tests.questions` (JSONB) — never queried or
 *  referenced independently of their parent test, so there's no separate
 *  `questions`/`options` table anymore. Question ids come from a dedicated
 *  sequence so they stay unique tenant-wide, which lets `/questions/:id`
 *  routes (no testId in the URL) look up their owning test by containment.
 *  Option ids only need to be unique within their own question. */

function nextOptionId(existing: StoredOption[]): number {
  return existing.reduce((max, o) => Math.max(max, o.id), 0) + 1;
}

function toOptions(input: OptionInput[], existing: StoredOption[] = []): StoredOption[] {
  let counter = nextOptionId(existing);
  return input.map((opt) => ({
    id: opt.id && existing.some((e) => e.id === opt.id) ? opt.id : counter++,
    optionText: opt.optionText || null,
    imageUrl: opt.imageUrl || null,
    isCorrect: opt.isCorrect,
  }));
}

export async function addQuestion(tenantId: number, testId: number, data: CreateQuestionInput) {
  return withTransaction(async (client) => {
    const testRes = await client.query<{ questions: StoredQuestion[] }>(
      `SELECT questions FROM tests WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [testId, tenantId]
    );
    if (!testRes.rows.length) throw ApiError.notFound('TEST_NOT_FOUND');

    const questions = testRes.rows[0].questions || [];
    const nextQuestionId = (
      await client.query<{ id: number }>(`SELECT nextval('quiz_question_id_seq')::int AS id`)
    ).rows[0].id;

    const newQuestion: StoredQuestion = {
      id: nextQuestionId,
      questionText: data.questionText,
      imageUrl: data.imageUrl || null,
      marks: data.marks,
      options: toOptions(data.options),
    };
    questions.push(newQuestion);

    await client.query(`UPDATE tests SET questions = $1::jsonb WHERE id = $2 AND tenant_id = $3`, [
      JSON.stringify(questions),
      testId,
      tenantId,
    ]);

    return { ...newQuestion, testId };
  });
}

/** Locates the test row whose `questions` JSONB array contains a question
 *  with this id, for the `/questions/:questionId` routes that don't carry
 *  a testId. Throws QUESTION_NOT_FOUND if no test in this tenant has it. */
async function findTestByQuestionId(
  client: PoolClient,
  tenantId: number,
  questionId: number
): Promise<{ testId: number; questions: StoredQuestion[] }> {
  const { rows } = await client.query<{ id: number; questions: StoredQuestion[] }>(
    `SELECT id, questions FROM tests
      WHERE tenant_id = $1
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(questions) elem WHERE (elem->>'id')::int = $2
        )
      FOR UPDATE`,
    [tenantId, questionId]
  );
  if (!rows.length) throw ApiError.notFound('QUESTION_NOT_FOUND');
  return { testId: rows[0].id, questions: rows[0].questions || [] };
}

export async function updateQuestion(tenantId: number, questionId: number, data: CreateQuestionInput) {
  return withTransaction(async (client) => {
    const { testId, questions } = await findTestByQuestionId(client, tenantId, questionId);
    const idx = questions.findIndex((q) => q.id === questionId);
    if (idx === -1) throw ApiError.notFound('QUESTION_NOT_FOUND');

    const updated: StoredQuestion = {
      id: questionId,
      questionText: data.questionText,
      imageUrl: data.imageUrl || null,
      marks: data.marks,
      options: toOptions(data.options, questions[idx].options),
    };
    questions[idx] = updated;

    await client.query(`UPDATE tests SET questions = $1::jsonb WHERE id = $2 AND tenant_id = $3`, [
      JSON.stringify(questions),
      testId,
      tenantId,
    ]);

    return { ...updated, testId };
  });
}

export async function deleteQuestion(tenantId: number, questionId: number) {
  return withTransaction(async (client) => {
    const { testId, questions } = await findTestByQuestionId(client, tenantId, questionId);
    const remaining = questions.filter((q) => q.id !== questionId);

    await client.query(`UPDATE tests SET questions = $1::jsonb WHERE id = $2 AND tenant_id = $3`, [
      JSON.stringify(remaining),
      testId,
      tenantId,
    ]);

    return { success: true };
  });
}

/** Teacher-facing: includes `isCorrect` (they own the test). */
export async function getTestQuestions(tenantId: number, testId: number) {
  const { rows } = await query<{ questions: StoredQuestion[] }>(
    `SELECT questions FROM tests WHERE id = $1 AND tenant_id = $2`,
    [testId, tenantId]
  );
  if (!rows.length) throw ApiError.notFound('TEST_NOT_FOUND');
  return rows[0].questions || [];
}

export interface TestSubmissionStudent {
  studentId: number;
  studentName: string;
  enrollmentNo: string | null;
  phone: string | null;
  avatarUrl: string | null;
  hasAttempted: boolean;
  marksObtained: number | null;
  maxMarks: number;
  percentage: number | null;
  submittedAt: string | null;
}

export interface TestSubmissionsResult {
  test: {
    id: number;
    title: string;
    maxMarks: number;
    durationMinutes: number | null;
    testDate: string | null;
    validUntil: string | null;
    isOnline: boolean;
    batchId: number | null;
    batchName: string;
    subjectName: string | null;
  };
  stats: {
    totalStudents: number;
    attemptedCount: number;
    missedCount: number;
    averageScore: number;
  };
  attempted: TestSubmissionStudent[];
  missed: TestSubmissionStudent[];
}

export async function getTestSubmissions(tenantId: number, testId: number): Promise<TestSubmissionsResult> {
  const testRes = await query<{
    id: number;
    title: string;
    maxMarks: number;
    durationMinutes: number | null;
    testDate: string | null;
    validUntil: string | null;
    isOnline: boolean;
    batchId: number | null;
    batchName: string | null;
    subjectName: string | null;
  }>(
    `SELECT t.id, t.title, t.max_marks AS "maxMarks", t.duration_minutes AS "durationMinutes",
            t.scheduled_at AS "testDate", t.valid_until AS "validUntil", t.is_online AS "isOnline",
            t.batch_id AS "batchId", COALESCE(b.name, 'All Batches') AS "batchName",
            s.name AS "subjectName"
       FROM tests t
       LEFT JOIN batches b ON b.id = t.batch_id AND b.tenant_id = t.tenant_id
       LEFT JOIN subjects s ON s.id = t.subject_id AND s.tenant_id = t.tenant_id
      WHERE t.id = $1 AND t.tenant_id = $2`,
    [testId, tenantId]
  );

  if (!testRes.rows[0]) throw ApiError.notFound('TEST_NOT_FOUND');
  const testInfo = testRes.rows[0];
  const maxMarks = testInfo.maxMarks || 0;

  // Query all students enrolled in this batch (or all students in the tenant if global test)
  const studentsRes = await query<{
    studentId: number;
    enrollmentNo: string | null;
    studentName: string;
    phone: string | null;
    avatarUrl: string | null;
    resultId: number | null;
    marksObtained: number | null;
    submittedAt: string | null;
  }>(
    `SELECT DISTINCT s.id AS "studentId",
            s.roll_no AS "enrollmentNo",
            u.full_name AS "studentName",
            u.phone,
            u.avatar_url AS "avatarUrl",
            tr.id AS "resultId",
            tr.marks_obtained AS "marksObtained",
            tr.submitted_at AS "submittedAt"
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN batch_enrollments be ON be.student_id = s.id AND be.tenant_id = s.tenant_id
       LEFT JOIN test_results tr ON tr.test_id = $1 AND tr.student_id = s.id AND tr.tenant_id = $2
      WHERE s.tenant_id = $2
        AND ($3::int IS NULL OR be.batch_id = $3::int)
      ORDER BY tr.marks_obtained DESC NULLS LAST, u.full_name ASC`,
    [testId, tenantId, testInfo.batchId]
  );

  const attempted: TestSubmissionStudent[] = [];
  const missed: TestSubmissionStudent[] = [];
  let totalScore = 0;

  for (const row of studentsRes.rows) {
    const hasAttempted = row.resultId !== null;
    const marks = hasAttempted ? (row.marksObtained ?? 0) : null;
    const percentage = hasAttempted && maxMarks > 0 ? Number(((marks! / maxMarks) * 100).toFixed(1)) : null;

    const item: TestSubmissionStudent = {
      studentId: row.studentId,
      studentName: row.studentName,
      enrollmentNo: row.enrollmentNo,
      phone: row.phone,
      avatarUrl: row.avatarUrl,
      hasAttempted,
      marksObtained: marks,
      maxMarks,
      percentage,
      submittedAt: row.submittedAt,
    };

    if (hasAttempted) {
      attempted.push(item);
      totalScore += marks ?? 0;
    } else {
      missed.push(item);
    }
  }

  const attemptedCount = attempted.length;
  const missedCount = missed.length;
  const totalStudents = attemptedCount + missedCount;
  const averageScore = attemptedCount > 0 ? Number((totalScore / attemptedCount).toFixed(1)) : 0;

  return {
    test: {
      id: testInfo.id,
      title: testInfo.title,
      maxMarks: testInfo.maxMarks,
      durationMinutes: testInfo.durationMinutes,
      testDate: testInfo.testDate,
      validUntil: testInfo.validUntil,
      isOnline: testInfo.isOnline,
      batchId: testInfo.batchId,
      batchName: testInfo.batchName || 'All Batches',
      subjectName: testInfo.subjectName,
    },
    stats: {
      totalStudents,
      attemptedCount,
      missedCount,
      averageScore,
    },
    attempted,
    missed,
  };
}
