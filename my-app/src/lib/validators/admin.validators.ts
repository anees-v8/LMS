import { z } from 'zod';
import { istDateString } from '../utils/istDate';

const phone = z.string().regex(/^\d{10,15}$/, 'Phone must be 10-15 digits');
const timeStr = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be HH:MM');

export const createTeacherSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    phone,
    password: z.string().min(6).max(100),
    // Required: teacher password-change/reset is OTP-verified via email
    // (see /auth/password/*, /auth/forgot-password) — without an email on
    // file a teacher would have no way to recover or change their password.
    email: z.string().trim().email(),
  })
  .strict();

export const createStudentSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    phone,
    password: z.string().min(6).max(100),
    parentName: z.string().trim().max(120).optional(),
    parentPhone: phone,
    grade: z.string().trim().max(30).optional(),
    rollNo: z.string().trim().max(30).optional(),
    // Required: a student must be enrolled in a batch at creation time.
    batchId: z.coerce.number().int().positive(),
    // Total fee for this student, overriding the batch's default fee_amount
    // (split into the same number of installments) — e.g. a scholarship.
    // Omit to use the batch's default.
    feeOverrideAmount: z.coerce.number().int().nonnegative().optional(),
  })
  .strict();

// null explicitly clears an existing override back to "use batch default";
// omitting the field entirely leaves it untouched.
export const updateStudentFeeOverrideSchema = z
  .object({ feeOverrideAmount: z.coerce.number().int().nonnegative().nullable() })
  .strict();

// Format-only regex previously let through any year (e.g. "1900-01-01" or
// "2500-12-31") — syntactically valid, but nonsense for an institute that
// never existed before 2000 and has no reason to plan a batch 80 years out.
// A bogus endDate in particular used to feed straight into
// generateFeeDues()'s span calculation, producing fee-installment due
// dates spaced across centuries.
const dateStr = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine((s) => {
    const year = Number(s.slice(0, 4));
    return year >= 2000 && year <= 2100;
  }, 'Date year must be between 2000 and 2100');

const feeFields = {
  // Both-or-neither — enforced below via .refine, mirroring the DB CHECK
  // (batches.fee_amount IS NULL) = (installment_count IS NULL).
  feeAmount: z.coerce.number().int().nonnegative().optional(),
  installmentCount: z.coerce.number().int().min(1).max(12).optional(),
};

export const createBatchSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    grade: z.string().trim().max(30).optional(),
    // Subjects this batch covers — set once here so every student enrolled
    // in the batch (now or later) automatically has these subjects. Required:
    // a batch with none leaves every enrolled student's Learn tab empty.
    subjectIds: z.array(z.coerce.number().int().positive()).min(1, 'Select at least one subject'),
    startDate: dateStr,
    endDate: dateStr.optional(),
    ...feeFields,
  })
  .strict()
  .refine((v) => (v.feeAmount === undefined) === (v.installmentCount === undefined), {
    message: 'feeAmount and installmentCount must be provided together',
    path: ['installmentCount'],
  });

export const updateBatchSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    grade: z.string().trim().max(30).optional(),
    // If provided at all it must still be non-empty — same reasoning as
    // createBatchSchema; omit the field entirely to leave subjects unchanged.
    subjectIds: z.array(z.coerce.number().int().positive()).min(1, 'Select at least one subject').optional(),
    startDate: dateStr.optional(),
    // null explicitly clears an existing end date back to open-ended;
    // omitting the field entirely leaves it untouched.
    endDate: dateStr.nullable().optional(),
    ...feeFields,
  })
  .strict()
  .refine((v) => (v.feeAmount === undefined) === (v.installmentCount === undefined), {
    message: 'feeAmount and installmentCount must be provided together',
    path: ['installmentCount'],
  });

export const createSubjectSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
  })
  .strict();

export const chapterNameSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
  })
  .strict();

export const chapterCompleteSchema = z
  .object({
    completed: z.boolean(),
  })
  .strict();

// `id` (not `batchId`) to match Next.js's requirement that every route
// under batches/[id]/... use the same dynamic segment name.
export const batchSubjectParamSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    subjectId: z.coerce.number().int().positive(),
  })
  .strict();

export const batchSubjectChapterParamSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    subjectId: z.coerce.number().int().positive(),
    chapterId: z.coerce.number().int().positive(),
  })
  .strict();

const scheduleEntrySchema = z
  .object({
    subjectId: z.coerce.number().int().positive(),
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: timeStr,
    endTime: timeStr,
  })
  .strict()
  .refine((v) => v.startTime < v.endTime, { message: 'startTime must be before endTime', path: ['endTime'] });

// Full-replace: the whole array is a batch's complete weekly schedule.
// An empty array is valid — it clears the batch's schedule entirely.
export const setBatchScheduleSchema = z
  .object({ scheduleEntries: z.array(scheduleEntrySchema) })
  .strict();

export const assignTeacherSchema = z
  .object({
    teacherUserId: z.coerce.number().int().positive(),
    batchId: z.coerce.number().int().positive(),
    subjectId: z.coerce.number().int().positive(),
  })
  .strict();

export const recordPaymentSchema = z
  .object({
    studentId: z.coerce.number().int().positive(),
    feeDueId: z.coerce.number().int().positive().optional(),
    amountPaid: z.coerce.number().int().min(1),
    method: z.enum(['cash', 'upi', 'card']).optional(),
  })
  .strict();

// Admin manual attendance correction — previously this route (POST
// /api/admin/attendance) did its own inline `if (!batchId || !date || ...)`
// truthy-check with no zod schema at all: no date-format check (a
// non-date string would only fail at the Postgres insert as a generic
// 500), no status-enum check (any string would be silently persisted).
// Dates are still year-bounded and can't be in the future (a "correction"
// for a date that hasn't happened yet makes no sense), but — unlike
// markAttendanceSchema's 90-day teacher-facing window — no lower bound,
// since a legitimate admin correction may need to reach further back.
export const adminAttendanceCorrectionSchema = z
  .object({
    batchId: z.coerce.number().int().positive(),
    subjectId: z.coerce.number().int().positive().optional(),
    date: dateStr.refine((s) => s <= istDateString(), 'Date cannot be in the future'),
    records: z
      .array(
        z
          .object({
            studentId: z.coerce.number().int().positive(),
            status: z.enum(['present', 'absent', 'late']),
          })
          .strict()
      )
      .min(1),
  })
  .strict();

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() }).strict();
export const studentIdParamSchema = z.object({ studentId: z.coerce.number().int().positive() }).strict();
export const batchIdParamSchema = z.object({ batchId: z.coerce.number().int().positive() }).strict();

export const broadcastNotificationSchema = z
  .object({
    title: z.string().trim().min(2).max(150),
    body: z.string().trim().max(2000).optional(),
    // Who receives it — defaults to students for backward compatibility.
    targetRole: z.enum(['student', 'teacher']).default('student'),
    // Omit to broadcast to everyone (of targetRole) in the institute; set to target one batch.
    batchId: z.coerce.number().int().positive().optional(),
  })
  .strict();
