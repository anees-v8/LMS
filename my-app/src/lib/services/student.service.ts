import { query } from '../db';
import ApiError from '../utils/ApiError';
import { buildWaUrl, doubtMessage } from './whatsapp.service';
import { istDayOfWeek } from '../utils/istDate';

/** Resolve the students.id for a logged-in student user. */
async function getStudentId(tenantId: number, userId: number): Promise<number> {
  const { rows } = await query<{ id: number }>(
    `SELECT id FROM students WHERE tenant_id=$1 AND user_id=$2`,
    [tenantId, userId]
  );
  if (!rows[0]) throw ApiError.notFound('STUDENT_PROFILE_NOT_FOUND');
  return rows[0].id;
}

/** Batch ids the student is enrolled in. */
async function enrolledBatchIds(tenantId: number, studentId: number): Promise<number[]> {
  const { rows } = await query<{ batch_id: number }>(
    `SELECT batch_id FROM batch_enrollments WHERE tenant_id=$1 AND student_id=$2`,
    [tenantId, studentId]
  );
  return rows.map((r) => r.batch_id);
}

export interface VideoItem {
  id: number;
  title: string;
  fileUrl: string;
  contentType: string;
  subject?: string | null;
  chapter?: string | null;
}

export interface LiveClassItem {
  id: number;
  title: string;
  meetUrl: string;
  scheduledAt: Date;
  joinable?: boolean;
}

export interface TimetableItem {
  id: number;
  subject: string;
  teacherName: string | null;
  startTime: string;
  endTime: string;
}

export interface UpcomingTest {
  id: number;
  title: string;
  subject: string | null;
  testDate: string | null;
  maxMarks: number;
}

export interface ContinuePlaying {
  id: number;
  title: string;
  fileUrl: string;
  contentType: string;
  chapter: string | null;
  subject: string | null;
  chapterId: number | null;
  progressSeconds: number;
  durationMinutes: number;
  durationSeconds: number;
}

export interface StudentDashboard {
  nextLiveClass: LiveClassItem | null;
  pendingFees: number;
  recentVideos: VideoItem[];
  continuePlaying: ContinuePlaying | null;
  attendancePct: number;       // 0-100
  todaySchedule: TimetableItem[];
  nextTest: UpcomingTest | null;
}

export async function dashboard(tenantId: number, userId: number): Promise<StudentDashboard> {
  const studentId = await getStudentId(tenantId, userId);
  const batchIds = await enrolledBatchIds(tenantId, studentId);
  const safeBatches = batchIds.length ? batchIds : [-1];

  const nextLive =
    (
      await query<LiveClassItem>(
        `SELECT id, title, meet_url AS "meetUrl", scheduled_at AS "scheduledAt"
       FROM live_classes
      WHERE tenant_id=$1 AND batch_id = ANY($2::int[]) AND scheduled_at >= now() - interval '1 hour'
      ORDER BY scheduled_at ASC LIMIT 1`,
        [tenantId, safeBatches]
      )
    ).rows[0] || null;

  const fees = (
    await query<{ pending: number }>(
      `SELECT GREATEST(0,
       COALESCE((SELECT sum(fd.amount) FROM fee_dues fd
                  WHERE fd.tenant_id=$1 AND fd.student_id=$2),0)::int
       - COALESCE((SELECT sum(amount_paid) FROM fee_payments WHERE tenant_id=$1 AND student_id=$2),0)::int
       )::int AS pending`,
      [tenantId, studentId]
    )
  ).rows[0];

  const recentVideos = (
    await query<VideoItem & { chapterId: number }>(
      `SELECT c.id, c.title, c.file_url AS "fileUrl", c.content_type AS "contentType",
              (SELECT ch->>'name' FROM subjects s, jsonb_array_elements(s.chapters) ch
                WHERE s.tenant_id = c.tenant_id AND (ch->>'id')::int = c.chapter_id) AS chapter,
              c.chapter_id AS "chapterId",
              (SELECT s.name FROM subjects s, jsonb_array_elements(s.chapters) ch
                WHERE s.tenant_id = c.tenant_id AND (ch->>'id')::int = c.chapter_id) AS subject
       FROM content c
       WHERE c.tenant_id=$1 AND (c.batch_id = ANY($2::int[]) OR c.batch_id IS NULL)
      ORDER BY c.created_at DESC LIMIT 5`,
      [tenantId, safeBatches]
    )
  ).rows;

  // Attendance %
  const attRow = (
    await query<{ total: number; present: number }>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status='present' OR status='late')::int AS present
       FROM attendance
       WHERE tenant_id=$1 AND student_id=$2`,
      [tenantId, studentId]
    )
  ).rows[0];
  const attendancePct = attRow.total > 0 ? Math.round((attRow.present / attRow.total) * 100) : 0;

  // Today's schedule (IST — the server may run in UTC, see istDate.ts).
  // LEFT JOINs because a schedule slot may not have a teacher assigned yet
  // (unlike the old timetable row, which always had a required teacher_id) —
  // such a slot should still show up, just with a null teacherName.
  const dow = istDayOfWeek();
  const todaySchedule = (
    await query<TimetableItem>(
      `SELECT bs.id, sub.name AS subject, u.full_name AS "teacherName",
              to_char(bs.start_time,'HH12:MI AM') AS "startTime",
              to_char(bs.end_time,'HH12:MI AM') AS "endTime"
       FROM batch_schedule bs
       JOIN subjects sub ON sub.id = bs.subject_id
       LEFT JOIN teacher_assignments ta ON ta.batch_id = bs.batch_id AND ta.subject_id = bs.subject_id AND ta.tenant_id = bs.tenant_id
       LEFT JOIN users u ON u.id = ta.teacher_user_id
       WHERE bs.tenant_id=$1 AND bs.batch_id = ANY($2::int[]) AND bs.day_of_week=$3
       ORDER BY bs.start_time`,
      [tenantId, safeBatches, dow]
    )
  ).rows;

  // Next upcoming test
  const nextTest = (
    await query<UpcomingTest>(
      `SELECT t.id, t.title, s.name AS subject, t.scheduled_at AS "testDate", t.max_marks AS "maxMarks"
       FROM tests t LEFT JOIN subjects s ON s.id = t.subject_id
       WHERE t.tenant_id=$1 AND t.batch_id = ANY($2::int[]) AND t.scheduled_at >= now()
       ORDER BY t.scheduled_at ASC LIMIT 1`,
      [tenantId, safeBatches]
    )
  ).rows[0] || null;

  const continuePlaying = (
    await query<ContinuePlaying>(
      `SELECT c.id, c.title, c.file_url AS "fileUrl", c.content_type AS "contentType",
              c.duration_minutes AS "durationMinutes", c.duration_seconds AS "durationSeconds",
              (SELECT ch->>'name' FROM subjects s, jsonb_array_elements(s.chapters) ch
                WHERE s.tenant_id = c.tenant_id AND (ch->>'id')::int = c.chapter_id) AS chapter,
              c.chapter_id AS "chapterId",
              (SELECT s.name FROM subjects s, jsonb_array_elements(s.chapters) ch
                WHERE s.tenant_id = c.tenant_id AND (ch->>'id')::int = c.chapter_id) AS subject,
              p.progress_seconds AS "progressSeconds"
       FROM user_content_progress p
       JOIN content c ON c.id = p.content_id
       WHERE p.tenant_id=$1 AND p.user_id=$2 AND c.content_type = 'video'
       ORDER BY p.updated_at DESC LIMIT 1`,
      [tenantId, userId]
    )
  ).rows[0] || null;

  return {
    nextLiveClass: nextLive,
    pendingFees: fees.pending,
    recentVideos,
    continuePlaying,
    attendancePct,
    todaySchedule,
    nextTest,
  };
}

export async function updateProgress(tenantId: number, userId: number, contentId: number, progressSeconds: number): Promise<void> {
  await query(
    `INSERT INTO user_content_progress (tenant_id, user_id, content_id, progress_seconds, updated_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id, content_id) DO UPDATE
     SET progress_seconds = EXCLUDED.progress_seconds,
         updated_at = CURRENT_TIMESTAMP`,
    [tenantId, userId, contentId, progressSeconds]
  );
}

export async function listVideos(
  tenantId: number,
  userId: number,
  subjectId: number | null
): Promise<VideoItem[]> {
  const studentId = await getStudentId(tenantId, userId);
  const batchIds = await enrolledBatchIds(tenantId, studentId);
  const safeBatches = batchIds.length ? batchIds : [-1];
  const params: unknown[] = [tenantId, safeBatches];
  let subFilter = '';
  if (subjectId) {
    params.push(subjectId);
    subFilter = `AND EXISTS (
      SELECT 1 FROM subjects s, jsonb_array_elements(s.chapters) ch
       WHERE s.tenant_id = c.tenant_id AND s.id = $3 AND (ch->>'id')::int = c.chapter_id
    )`;
  }
  const { rows } = await query<VideoItem>(
    `SELECT c.id, c.title, c.file_url AS "fileUrl", c.content_type AS "contentType",
            (SELECT ch->>'name' FROM subjects s, jsonb_array_elements(s.chapters) ch
              WHERE s.tenant_id = c.tenant_id AND (ch->>'id')::int = c.chapter_id) AS chapter,
            (SELECT s.name FROM subjects s, jsonb_array_elements(s.chapters) ch
              WHERE s.tenant_id = c.tenant_id AND (ch->>'id')::int = c.chapter_id) AS subject
       FROM content c
      WHERE c.tenant_id=$1 AND (c.batch_id = ANY($2::int[]) OR c.batch_id IS NULL) ${subFilter}
      ORDER BY c.created_at DESC`,
    params
  );
  return rows;
}

export async function videoDetail(tenantId: number, userId: number, id: number): Promise<VideoItem> {
  const studentId = await getStudentId(tenantId, userId);
  const batchIds = await enrolledBatchIds(tenantId, studentId);
  const safeBatches = batchIds.length ? batchIds : [-1];
  const { rows } = await query<VideoItem>(
    `SELECT c.id, c.title, c.file_url AS "fileUrl", c.content_type AS "contentType"
       FROM content c
      WHERE c.tenant_id=$1 AND c.id=$2 AND (c.batch_id = ANY($3::int[]) OR c.batch_id IS NULL)`,
    [tenantId, id, safeBatches]
  );
  if (!rows[0]) throw ApiError.notFound('VIDEO_NOT_FOUND');
  return rows[0];
}

export async function todayLive(tenantId: number, userId: number): Promise<LiveClassItem[]> {
  const studentId = await getStudentId(tenantId, userId);
  const batchIds = await enrolledBatchIds(tenantId, studentId);
  const safeBatches = batchIds.length ? batchIds : [-1];
  const { rows } = await query<LiveClassItem>(
    `SELECT id, title, meet_url AS "meetUrl", scheduled_at AS "scheduledAt",
            (now() BETWEEN scheduled_at - interval '10 minutes'
                       AND scheduled_at + interval '60 minutes') AS joinable
       FROM live_classes
      WHERE tenant_id=$1 AND batch_id = ANY($2::int[])
        AND scheduled_at::date = now()::date
      ORDER BY scheduled_at`,
    [tenantId, safeBatches]
  );
  return rows;
}

export interface UpcomingLiveClassItem {
  id: number;
  title: string;
  meetUrl: string;
  scheduledAt: string;
  batchName: string;
  isPast: boolean;
  joinable: boolean;
}

export async function upcomingLive(tenantId: number, userId: number): Promise<UpcomingLiveClassItem[]> {
  const studentId = await getStudentId(tenantId, userId);
  const batchIds = await enrolledBatchIds(tenantId, studentId);
  const safeBatches = batchIds.length ? batchIds : [-1];
  const { rows } = await query<UpcomingLiveClassItem>(
    `SELECT lc.id, lc.title, lc.meet_url AS "meetUrl",
            lc.scheduled_at AS "scheduledAt", b.name AS "batchName",
            (lc.scheduled_at + interval '60 minutes' < now()) AS "isPast",
            (now() BETWEEN lc.scheduled_at - interval '10 minutes'
                       AND lc.scheduled_at + interval '60 minutes') AS "joinable"
       FROM live_classes lc
       JOIN batches b ON b.id = lc.batch_id
      WHERE lc.tenant_id=$1 AND lc.batch_id = ANY($2::int[])
        AND lc.scheduled_at >= now() - interval '1 hour'
        AND lc.scheduled_at <= now() + interval '7 days'
      ORDER BY lc.scheduled_at ASC`,
    [tenantId, safeBatches]
  );
  return rows;
}

export interface FeePayment {
  id: number;
  receiptNo: string;
  amount: number;
  paidOn: Date;
  method: string;
}

export interface StudentFees {
  total: number;
  paid: number;
  pending: number;
  payments: FeePayment[];
}

export async function fees(tenantId: number, userId: number): Promise<StudentFees> {
  const studentId = await getStudentId(tenantId, userId);

  const totals = (
    await query<{ total: number; paid: number }>(
      `SELECT
       COALESCE((SELECT sum(fd.amount) FROM fee_dues fd
                  WHERE fd.tenant_id=$1 AND fd.student_id=$2),0)::int AS total,
       COALESCE((SELECT sum(amount_paid) FROM fee_payments WHERE tenant_id=$1 AND student_id=$2),0)::int AS paid`,
      [tenantId, studentId]
    )
  ).rows[0];

  const payments = (
    await query<FeePayment>(
      `SELECT id, receipt_no AS "receiptNo", amount_paid AS "amount", paid_on AS "paidOn", method
       FROM fee_payments WHERE tenant_id=$1 AND student_id=$2 ORDER BY paid_on DESC`,
      [tenantId, studentId]
    )
  ).rows;

  return { total: totals.total, paid: totals.paid, pending: Math.max(0, totals.total - totals.paid), payments };
}

export interface Receipt {
  receiptNo: string;
  amount: number;
  paidOn: Date;
  method: string;
  studentName: string;
  instituteName: string;
}

export async function receipt(tenantId: number, userId: number, paymentId: number): Promise<Receipt> {
  const studentId = await getStudentId(tenantId, userId);
  const { rows } = await query<Receipt>(
    `SELECT fp.receipt_no AS "receiptNo", fp.amount_paid AS amount, fp.paid_on AS "paidOn",
            fp.method, u.full_name AS "studentName", t.name AS "instituteName"
       FROM fee_payments fp
       JOIN students s ON s.id=fp.student_id
       JOIN users u ON u.id=s.user_id
       JOIN tenants t ON t.id=fp.tenant_id
      WHERE fp.id=$1 AND fp.tenant_id=$2 AND fp.student_id=$3`,
    [paymentId, tenantId, studentId]
  );
  if (!rows[0]) throw ApiError.notFound('RECEIPT_NOT_FOUND');
  return rows[0];
}

/** Free wa.me link to the chosen teacher for a doubt. */
export async function askDoubt(
  tenantId: number,
  userId: number,
  teacherId: number,
  chapter?: string
): Promise<{ waUrl: string }> {
  const student = (
    await query<{ name: string; institute: string }>(
      `SELECT u.full_name AS name, t.name AS institute
       FROM students s JOIN users u ON u.id=s.user_id JOIN tenants t ON t.id=s.tenant_id
      WHERE s.tenant_id=$1 AND s.user_id=$2`,
      [tenantId, userId]
    )
  ).rows[0];
  if (!student) throw ApiError.notFound('STUDENT_PROFILE_NOT_FOUND');

  const teacher = (
    await query<{ phone: string }>(
      `SELECT phone FROM users WHERE id=$1 AND tenant_id=$2 AND role='teacher'`,
      [teacherId, tenantId]
    )
  ).rows[0];
  if (!teacher) throw ApiError.badRequest('INVALID_TEACHER');

  const msg = doubtMessage({
    studentName: student.name,
    instituteName: student.institute,
    chapter: chapter || 'a topic',
  });
  return { waUrl: buildWaUrl(teacher.phone, msg) };
}

// ─── SUBJECTS ───────────────────────────────────────────────────────────────

export interface SubjectWithStats {
  id: number;
  name: string;
  totalChapters: number;
  totalVideos: number;
}

export async function listSubjects(tenantId: number, userId: number): Promise<SubjectWithStats[]> {
  const studentId = await getStudentId(tenantId, userId);
  const batchIds = await enrolledBatchIds(tenantId, studentId);
  const safeBatches = batchIds.length ? batchIds : [-1];

  // Subjects come from the student's batches' subject_ids — set once at
  // batch-create time — not from timetable entries. A batch with no
  // timetable slots yet (or a subject with no class scheduled this week)
  // still shows up here, which is the whole point.
  const { rows } = await query<SubjectWithStats>(
    `SELECT s.id, s.name,
            jsonb_array_length(s.chapters)::int AS "totalChapters",
            COUNT(DISTINCT c.id) FILTER (WHERE c.content_type = 'video')::int AS "totalVideos"
       FROM subjects s
       LEFT JOIN LATERAL jsonb_array_elements(s.chapters) ch ON true
       LEFT JOIN content c ON (ch->>'id')::int = c.chapter_id
      WHERE s.tenant_id=$1 AND s.is_active = true
        AND s.id = ANY(
          SELECT DISTINCT unnest(b.subject_ids) FROM batches b
          WHERE b.tenant_id=$1 AND b.id = ANY($2::int[])
        )
      GROUP BY s.id, s.name, s.chapters
      ORDER BY s.name`,
    [tenantId, safeBatches]
  );
  return rows;
}

// ─── CHAPTERS ───────────────────────────────────────────────────────────────

export interface ChapterWithCounts {
  id: number;
  name: string;
  videoCount: number;
  docCount: number;
  sortOrder: number;
}

export async function listChapters(
  tenantId: number,
  userId: number,
  subjectId: number
): Promise<ChapterWithCounts[]> {
  const studentId = await getStudentId(tenantId, userId);
  const batchIds = await enrolledBatchIds(tenantId, studentId);
  const safeBatches = batchIds.length ? batchIds : [-1];

  // Only chapters of a subject the student is actually enrolled in via one
  // of their batches — previously missing, letting any student in the
  // tenant read any subject's chapter list by id.
  const { rows } = await query<ChapterWithCounts>(
    `SELECT (ch->>'id')::int AS "id", ch->>'name' AS "name",
            COUNT(c.id) FILTER (WHERE c.content_type = 'video')::int AS "videoCount",
            COUNT(c.id) FILTER (WHERE c.content_type != 'video')::int AS "docCount",
            ROW_NUMBER() OVER (ORDER BY (ch->>'id')::int)::int AS "sortOrder"
       FROM subjects s
       JOIN LATERAL jsonb_array_elements(s.chapters) ch ON true
       LEFT JOIN content c ON c.chapter_id = (ch->>'id')::int
      WHERE s.tenant_id=$1 AND s.id=$2 AND s.is_active = true
        AND s.id = ANY(
          SELECT DISTINCT unnest(b.subject_ids) FROM batches b
          WHERE b.tenant_id=$1 AND b.id = ANY($3::int[])
        )
      GROUP BY ch->>'id', ch->>'name'
      ORDER BY (ch->>'id')::int`,
    [tenantId, subjectId, safeBatches]
  );
  return rows;
}

// ─── CHAPTER CONTENT ─────────────────────────────────────────────────────────

export interface ContentItem {
  id: number;
  title: string;
  fileUrl: string;
  contentType: string;
  durationMinutes: number;
  durationSeconds: number;
}

export async function listChapterContent(
  tenantId: number,
  userId: number,
  chapterId: number
): Promise<ContentItem[]> {
  const studentId = await getStudentId(tenantId, userId);
  const batchIds = await enrolledBatchIds(tenantId, studentId);
  const safeBatches = batchIds.length ? batchIds : [-1];

  // Resolve chapterId -> its owning subject, then confirm that subject is
  // taught in one of the student's enrolled batches — previously missing,
  // letting any student in the tenant read any chapter's content by id.
  const owning = await query<{ subjectId: number }>(
    `SELECT s.id AS "subjectId"
       FROM subjects s, jsonb_array_elements(s.chapters) ch
      WHERE s.tenant_id=$1 AND s.is_active = true AND (ch->>'id')::int = $2
        AND s.id = ANY(
          SELECT DISTINCT unnest(b.subject_ids) FROM batches b
          WHERE b.tenant_id=$1 AND b.id = ANY($3::int[])
        )`,
    [tenantId, chapterId, safeBatches]
  );
  if (!owning.rowCount) throw ApiError.notFound('CHAPTER_NOT_FOUND');

  const { rows } = await query<ContentItem>(
    `SELECT id, title, file_url AS "fileUrl", content_type AS "contentType",
            duration_minutes AS "durationMinutes", duration_seconds AS "durationSeconds"
       FROM content
      WHERE tenant_id=$1 AND chapter_id=$2
      ORDER BY created_at ASC`,
    [tenantId, chapterId]
  );
  return rows;
}

// ─── TESTS ──────────────────────────────────────────────────────────────────

export interface StudentTest {
  id: number;
  title: string;
  subject: string | null;
  testDate: string | null;
  maxMarks: number;
  durationMinutes: number | null;
  isOnline: boolean;
  // for completed:
  marksObtained?: number;
}

export async function listTests(
  tenantId: number,
  userId: number
): Promise<{ active: StudentTest[]; completed: StudentTest[] }> {
  const studentId = await getStudentId(tenantId, userId);
  const batchIds = await enrolledBatchIds(tenantId, studentId);
  const safeBatches = batchIds.length ? batchIds : [-1];

  const active = (
    await query<StudentTest>(
      `SELECT t.id, t.title, s.name AS subject, t.scheduled_at AS "testDate",
              t.max_marks AS "maxMarks", t.duration_minutes AS "durationMinutes", t.is_online AS "isOnline"
         FROM tests t
         LEFT JOIN subjects s ON s.id = t.subject_id
        WHERE t.tenant_id=$1 AND t.batch_id = ANY($2::int[])
          AND (t.scheduled_at IS NULL OR t.scheduled_at >= now())
          AND NOT EXISTS (
            SELECT 1 FROM test_results tr
            WHERE tr.test_id = t.id AND tr.student_id = $3
          )
        ORDER BY t.scheduled_at ASC NULLS LAST`,
      [tenantId, safeBatches, studentId]
    )
  ).rows;

  const completed = (
    await query<StudentTest>(
      `SELECT t.id, t.title, s.name AS subject, t.scheduled_at AS "testDate",
              t.max_marks AS "maxMarks", t.duration_minutes AS "durationMinutes", t.is_online AS "isOnline",
              tr.marks_obtained AS "marksObtained"
         FROM tests t
         JOIN test_results tr ON tr.test_id = t.id AND tr.student_id = $3
         LEFT JOIN subjects s ON s.id = t.subject_id
        WHERE t.tenant_id=$1 AND t.batch_id = ANY($2::int[])
        ORDER BY t.scheduled_at DESC NULLS FIRST`,
      [tenantId, safeBatches, studentId]
    )
  ).rows;

  return { active, completed };
}

// ─── QUIZ QUESTIONS ──────────────────────────────────────────────────────────

export interface QuizQuestion {
  id: number;
  questionText: string;
  imageUrl: string | null;
  marks: number;
  options: { id: number; optionText: string | null; imageUrl: string | null }[];
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

export async function getTestQuestions(
  tenantId: number,
  userId: number,
  testId: number
): Promise<QuizQuestion[]> {
  const studentId = await getStudentId(tenantId, userId);
  const batchIds = await enrolledBatchIds(tenantId, studentId);
  const safeBatches = batchIds.length ? batchIds : [-1];

  // Verify test belongs to student's batch
  const testCheck = await query<{ questions: StoredQuestion[] }>(
    `SELECT questions FROM tests WHERE id=$1 AND tenant_id=$2 AND batch_id = ANY($3::int[])`,
    [testId, tenantId, safeBatches]
  );
  if (!testCheck.rows[0]) throw ApiError.notFound('TEST_NOT_FOUND');

  const questions = testCheck.rows[0].questions || [];

  // isCorrect is deliberately stripped — the student hasn't submitted yet.
  return questions.map((q) => ({
    id: q.id,
    questionText: q.questionText,
    imageUrl: q.imageUrl,
    marks: q.marks,
    options: q.options.map((o) => ({ id: o.id, optionText: o.optionText, imageUrl: o.imageUrl })),
  }));
}

// ─── SUBMIT QUIZ ─────────────────────────────────────────────────────────────

export interface QuizSubmitPayload {
  answers: Record<string, number>; // questionId -> optionId
}

export interface QuizResult {
  marksObtained: number;
  maxMarks: number;
  correct: number;
  incorrect: number;
  skipped: number;
  total: number;
}

export async function submitTest(
  tenantId: number,
  userId: number,
  testId: number,
  payload: QuizSubmitPayload
): Promise<QuizResult> {
  const studentId = await getStudentId(tenantId, userId);
  const batchIds = await enrolledBatchIds(tenantId, studentId);
  const safeBatches = batchIds.length ? batchIds : [-1];

  // Verify not already submitted
  const existing = await query(
    `SELECT id FROM test_results WHERE test_id=$1 AND student_id=$2`,
    [testId, studentId]
  );
  if (existing.rows[0]) throw ApiError.badRequest('TEST_ALREADY_SUBMITTED');

  // Same batch-enrollment scoping getTestQuestions already applies —
  // previously missing here, letting a student submit answers for a test
  // belonging to a batch they aren't enrolled in if they guessed/knew its id.
  const test = (
    await query<{
      max_marks: number;
      questions: StoredQuestion[];
      scheduled_at: Date | null;
      duration_minutes: number | null;
    }>(
      `SELECT max_marks, questions, scheduled_at, duration_minutes
         FROM tests WHERE id=$1 AND tenant_id=$2 AND batch_id = ANY($3::int[])`,
      [testId, tenantId, safeBatches]
    )
  ).rows[0];
  if (!test) throw ApiError.notFound('TEST_NOT_FOUND');

  // A test with both a scheduled time and a duration has a real deadline —
  // submitting after it closes previously succeeded regardless of the
  // app's client-side timer. A test missing either field has no enforced
  // window (nothing to compare against), same as today's behavior.
  if (test.scheduled_at && test.duration_minutes) {
    const closesAt = new Date(test.scheduled_at.getTime() + test.duration_minutes * 60_000);
    if (new Date() > closesAt) {
      throw ApiError.badRequest('TEST_WINDOW_CLOSED', 'This test is no longer accepting submissions.');
    }
  }

  const questions = test.questions || [];
  if (questions.length === 0) throw ApiError.notFound('TEST_HAS_NO_QUESTIONS');

  let correct = 0;
  let incorrect = 0;
  let skipped = 0;
  let marksObtained = 0;

  // Per-question answer record, stored alongside the result so a future
  // "review answers" screen has something to read (previously only the
  // aggregate marks_obtained was persisted — individual answers were
  // computed here and then discarded).
  const answers: Record<string, { selectedOptionId: number | null; isCorrect: boolean }> = {};

  for (const q of questions) {
    const submitted = payload.answers[String(q.id)];
    const correctOpt = q.options.find((o) => o.isCorrect);
    if (submitted === undefined || submitted === null) {
      skipped++;
      answers[String(q.id)] = { selectedOptionId: null, isCorrect: false };
    } else if (correctOpt && submitted === correctOpt.id) {
      correct++;
      marksObtained += q.marks;
      answers[String(q.id)] = { selectedOptionId: submitted, isCorrect: true };
    } else {
      incorrect++;
      answers[String(q.id)] = { selectedOptionId: submitted, isCorrect: false };
    }
  }

  await query(
    `INSERT INTO test_results (tenant_id, test_id, student_id, marks_obtained, answers)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [tenantId, testId, studentId, marksObtained, JSON.stringify(answers)]
  );

  return {
    marksObtained,
    maxMarks: test.max_marks,
    correct,
    incorrect,
    skipped,
    total: questions.length,
  };
}

// ─── ATTENDANCE MONTHLY ──────────────────────────────────────────────────────

export interface MonthlyAttendance {
  month: string;  // e.g. "July 2025"
  present: number;
  absent: number;
  total: number;
}

export async function monthlyAttendance(
  tenantId: number,
  userId: number
): Promise<MonthlyAttendance[]> {
  const studentId = await getStudentId(tenantId, userId);
  const { rows } = await query<MonthlyAttendance>(
    `SELECT to_char(date, 'Month YYYY') AS month,
            COUNT(*) FILTER (WHERE status='present' OR status='late')::int AS present,
            COUNT(*) FILTER (WHERE status='absent')::int AS absent,
            COUNT(*)::int AS total
       FROM attendance
      WHERE tenant_id=$1 AND student_id=$2
      GROUP BY to_char(date, 'Month YYYY'), date_trunc('month', date)
      ORDER BY date_trunc('month', date) DESC
      LIMIT 6`,
    [tenantId, studentId]
  );
  return rows;
}

// ─── QR ATTENDANCE SCAN ──────────────────────────────────────────────────────

export interface QrScanResult {
  alreadyMarked: boolean;
  status: 'present' | 'absent' | 'late';
  batchId: number;
  date: string;
}

/**
 * Marks the caller present via a teacher-generated QR session. Expiry is
 * checked with the DB's own `now()`, never the client's clock. If this
 * student already has an attendance row for that batch+date (marked
 * manually or from an earlier scan), it is left untouched and reported
 * back as `alreadyMarked` — a late scan never silently overwrites a
 * teacher's existing call on that student.
 */
export async function scanAttendanceQr(
  tenantId: number,
  userId: number,
  token: string
): Promise<QrScanResult> {
  const studentId = await getStudentId(tenantId, userId);

  const session = await query<{
    id: number;
    batchId: number;
    subjectId: number;
    batchScheduleId: number | null;
    date: string;
    createdBy: number;
    expired: boolean;
  }>(
    `SELECT id, batch_id AS "batchId", subject_id AS "subjectId", batch_schedule_id AS "batchScheduleId",
            date, created_by AS "createdBy", (now() > expires_at) AS expired
       FROM attendance_sessions WHERE token=$1 AND tenant_id=$2`,
    [token, tenantId]
  );
  const s = session.rows[0];
  if (!s) throw ApiError.badRequest('INVALID_QR', 'This QR code is not valid.');
  if (s.expired) throw ApiError.badRequest('QR_EXPIRED', 'This QR code has expired. Ask your teacher to generate a new one.');

  const enrolled = await query(
    `SELECT 1 FROM batch_enrollments WHERE student_id=$1 AND batch_id=$2 AND tenant_id=$3`,
    [studentId, s.batchId, tenantId]
  );
  if (!enrolled.rowCount) throw ApiError.forbidden('NOT_YOUR_BATCH', 'You are not enrolled in this batch.');

  const existing = await query<{ status: 'present' | 'absent' | 'late' }>(
    `SELECT status FROM attendance WHERE student_id=$1 AND date=$2 AND batch_id=$3 AND subject_id=$4`,
    [studentId, s.date, s.batchId, s.subjectId]
  );
  if (existing.rows[0]) {
    return { alreadyMarked: true, status: existing.rows[0].status, batchId: s.batchId, date: s.date };
  }

  // ON CONFLICT DO NOTHING covers the rare race where two scans/taps for
  // the same student land between the check above and this insert — the
  // table's UNIQUE(student_id, date, batch_id, subject_id) would otherwise
  // surface as a raw constraint-violation error instead of a graceful
  // "already marked".
  const inserted = await query<{ id: number }>(
    `INSERT INTO attendance (tenant_id, batch_id, subject_id, batch_schedule_id, student_id, date, status, marked_by, session_id)
     VALUES ($1,$2,$3,$4,$5,$6,'present',$7,$8)
     ON CONFLICT (student_id, date, batch_id, subject_id) DO NOTHING
     RETURNING id`,
    [tenantId, s.batchId, s.subjectId, s.batchScheduleId, studentId, s.date, s.createdBy, s.id]
  );

  if (inserted.rows.length === 0) {
    const raced = await query<{ status: 'present' | 'absent' | 'late' }>(
      `SELECT status FROM attendance WHERE student_id=$1 AND date=$2 AND batch_id=$3 AND subject_id=$4`,
      [studentId, s.date, s.batchId, s.subjectId]
    );
    return { alreadyMarked: true, status: raced.rows[0]?.status ?? 'present', batchId: s.batchId, date: s.date };
  }

  return { alreadyMarked: false, status: 'present', batchId: s.batchId, date: s.date };
}

// ─── PERFORMANCE ─────────────────────────────────────────────────────────────

export interface SubjectPerformance {
  subject: string;
  totalMarks: number;
  obtainedMarks: number;
  testCount: number;
}

export async function subjectPerformance(
  tenantId: number,
  userId: number
): Promise<SubjectPerformance[]> {
  const studentId = await getStudentId(tenantId, userId);
  const { rows } = await query<SubjectPerformance>(
    `SELECT s.name AS subject,
            SUM(t.max_marks)::int AS "totalMarks",
            SUM(tr.marks_obtained)::int AS "obtainedMarks",
            COUNT(*)::int AS "testCount"
       FROM test_results tr
       JOIN tests t ON t.id = tr.test_id
       LEFT JOIN subjects s ON s.id = t.subject_id
      WHERE tr.tenant_id=$1 AND tr.student_id=$2
      GROUP BY s.name
      ORDER BY s.name`,
    [tenantId, studentId]
  );
  return rows;
}

// ─── STUDENT PROFILE ─────────────────────────────────────────────────────────

export interface StudentProfile {
  fullName: string;
  phone: string | null;
  rollNo: string | null;
  grade: string | null;
  batchName: string | null;
  parentName: string | null;
  parentPhone: string | null;
  attendancePct: number;
  testsGiven: number;
  avgScore: number | null;
}

export async function getProfile(tenantId: number, userId: number): Promise<StudentProfile> {
  const studentId = await getStudentId(tenantId, userId);

  const profileRow = (
    await query<{
      fullName: string;
      phone: string | null;
      rollNo: string | null;
      grade: string | null;
      batchName: string | null;
      parentName: string | null;
      parentPhone: string | null;
    }>(
      `SELECT u.full_name AS "fullName", u.phone,
              s.roll_no AS "rollNo", s.grade, s.parent_name AS "parentName", s.parent_phone AS "parentPhone",
              b.name AS "batchName"
         FROM students s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN batch_enrollments be ON be.student_id = s.id AND be.tenant_id = s.tenant_id
         LEFT JOIN batches b ON b.id = be.batch_id
        WHERE s.tenant_id=$1 AND s.user_id=$2
        LIMIT 1`,
      [tenantId, userId]
    )
  ).rows[0];

  if (!profileRow) throw ApiError.notFound('STUDENT_PROFILE_NOT_FOUND');

  const attRow = (
    await query<{ total: number; present: number }>(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status='present' OR status='late')::int AS present
         FROM attendance WHERE tenant_id=$1 AND student_id=$2`,
      [tenantId, studentId]
    )
  ).rows[0];
  const attendancePct =
    attRow && attRow.total > 0 ? Math.round((attRow.present / attRow.total) * 100) : 0;

  const testStats = (
    await query<{ testsGiven: number; avgScore: number | null }>(
      `SELECT COUNT(*)::int AS "testsGiven",
              CASE WHEN SUM(t.max_marks) > 0
                   THEN ROUND(SUM(tr.marks_obtained)::numeric / SUM(t.max_marks) * 100)::int
                   ELSE NULL END AS "avgScore"
         FROM test_results tr
         JOIN tests t ON t.id = tr.test_id
        WHERE tr.tenant_id=$1 AND tr.student_id=$2`,
      [tenantId, studentId]
    )
  ).rows[0];

  return {
    ...profileRow,
    attendancePct,
    testsGiven: testStats?.testsGiven ?? 0,
    avgScore: testStats?.avgScore ?? null,
  };
}
