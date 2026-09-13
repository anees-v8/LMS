import { after } from 'next/server';
import { query, withTransaction } from '../db';
import ApiError from '../utils/ApiError';
import * as notificationCenter from './notificationCenter.service';
import logger from '../utils/logger';
import { formatIst } from '../utils/istDate';
import type { PoolClient } from 'pg';

export interface CreateTestInput {
  title: string;
  batchId?: number;
  subjectId?: number;
  maxMarks?: number;
  testDate?: string;
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
  const { rows } = await query(
    `INSERT INTO tests (tenant_id, title, batch_id, subject_id, max_marks, scheduled_at, duration_minutes, is_online)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, tenant_id, title, batch_id, subject_id, max_marks,
               scheduled_at AS test_date, duration_minutes, is_online`,
    [
      tenantId,
      data.title,
      data.batchId || null,
      data.subjectId || null,
      data.maxMarks || 0,
      data.testDate || null,
      data.durationMinutes || null,
      data.isOnline,
    ]
  );
  const test = rows[0];

  if (data.batchId && data.testDate) {
    after(() =>
      notificationCenter
        .batchStudentUserIds(tenantId, data.batchId!)
        .then((userIds) =>
          notificationCenter.sendNotification({
            userIds,
            tenantId,
            title: 'New test scheduled',
            body: `${data.title} — scheduled for ${formatIst(data.testDate!)}.`,
            type: 'test_scheduled',
            entityId: test.id,
          })
        )
        .catch((err) => logger.error('Test-scheduled notify failed', { error: err instanceof Error ? err.message : String(err) }))
    );
  }

  return test;
}

export async function listTests(tenantId: number) {
  // Explicit column list (not `t.*`) so `scheduled_at` re-aliases to the
  // `test_date` key the teacher app's raw (unaliased) reads still expect,
  // and `question_count` now counts JSONB array entries, not table rows.
  const { rows } = await query(
    `SELECT t.id, t.tenant_id, t.title, t.batch_id, t.subject_id, t.max_marks,
            t.scheduled_at AS test_date, t.duration_minutes, t.is_online,
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
