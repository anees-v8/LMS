import { z } from 'zod';

const phone = z.string().regex(/^\d{10,15}$/, 'Phone must be 10-15 digits');
const timeStr = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be HH:MM');

export const createTeacherSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    phone,
    password: z.string().min(6).max(100),
    email: z.string().email().optional(),
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
    // (split by the batch's billing_cycle the same way) — e.g. a scholarship.
    // Omit to use the batch's default.
    feeOverrideAmount: z.coerce.number().int().nonnegative().optional(),
  })
  .strict();

// null explicitly clears an existing override back to "use batch default";
// omitting the field entirely leaves it untouched.
export const updateStudentFeeOverrideSchema = z
  .object({ feeOverrideAmount: z.coerce.number().int().nonnegative().nullable() })
  .strict();

const feeFields = {
  // Both-or-neither — enforced below via .refine, mirroring the DB CHECK
  // (batches.fee_amount IS NULL) = (billing_cycle IS NULL).
  feeAmount: z.coerce.number().int().nonnegative().optional(),
  billingCycle: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
};

export const createBatchSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    grade: z.string().trim().max(30).optional(),
    // Subjects this batch covers — set once here so every student enrolled
    // in the batch (now or later) automatically has these subjects. Required:
    // a batch with none leaves every enrolled student's Learn tab empty.
    subjectIds: z.array(z.coerce.number().int().positive()).min(1, 'Select at least one subject'),
    ...feeFields,
  })
  .strict()
  .refine((v) => (v.feeAmount === undefined) === (v.billingCycle === undefined), {
    message: 'feeAmount and billingCycle must be provided together',
    path: ['billingCycle'],
  });

export const updateBatchSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    grade: z.string().trim().max(30).optional(),
    // If provided at all it must still be non-empty — same reasoning as
    // createBatchSchema; omit the field entirely to leave subjects unchanged.
    subjectIds: z.array(z.coerce.number().int().positive()).min(1, 'Select at least one subject').optional(),
    ...feeFields,
  })
  .strict()
  .refine((v) => (v.feeAmount === undefined) === (v.billingCycle === undefined), {
    message: 'feeAmount and billingCycle must be provided together',
    path: ['billingCycle'],
  });

export const createSubjectSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
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
