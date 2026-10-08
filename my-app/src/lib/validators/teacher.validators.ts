import { z } from 'zod';

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() }).strict();

export const markAttendanceSchema = z
  .object({
    batchId: z.coerce.number().int().positive(),
    subjectId: z.coerce.number().int().positive(),
    batchScheduleId: z.coerce.number().int().positive().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
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

export const createQrSessionSchema = z
  .object({
    batchId: z.coerce.number().int().positive(),
    subjectId: z.coerce.number().int().positive(),
    batchScheduleId: z.coerce.number().int().positive().optional(),
    validForMinutes: z.coerce.number().int().min(1).max(120),
  })
  .strict();

export const qrSessionIdParamSchema = z.object({ sessionId: z.coerce.number().int().positive() }).strict();

export const createContentSchema = z
  .object({
    title: z.string().trim().min(1).max(150),
    fileUrl: z.string().url(),
    contentType: z.enum(['video', 'document', 'image']),
    batchId: z.coerce.number().int().positive().optional(),
    chapterId: z.coerce.number().int().positive(),
  })
  .strict();

export const createChapterSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    subjectId: z.coerce.number().int().positive(),
  })
  .strict();

export const connectGoogleSchema = z
  .object({
    serverAuthCode: z.string().min(10),
  })
  .strict();

export const createLiveClassSchema = z
  .object({
    title: z.string().trim().min(1).max(150),
    batchId: z.coerce.number().int().positive(),
    scheduledAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/)),
    durationMinutes: z.coerce.number().int().min(15).max(240).optional(),
  })
  .strict();

export const batchIdParamSchema = z.object({ batchId: z.coerce.number().int().positive() }).strict();
export const batchStudentsQuerySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD').optional(),
    subjectId: z.coerce.number().int().positive().optional(),
  })
  .strict();
export const studentIdParamSchema = z.object({ studentId: z.coerce.number().int().positive() }).strict();
export const doubtLinkQuerySchema = z.object({ text: z.string().trim().max(500).optional() }).strict();

export const createTestSchema = z
  .object({
    title: z.string().trim().min(1).max(150),
    batchId: z.coerce.number().int().positive().optional(),
    subjectId: z.coerce.number().int().positive().optional(),
    maxMarks: z.coerce.number().int().nonnegative().optional().default(0),
    testDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/, 'datetime must be YYYY-MM-DDTHH:MM'))
      .optional(),
    durationMinutes: z.coerce.number().int().positive().optional(),
    isOnline: z.boolean().default(false),
  })
  .strict();

export const optionSchema = z
  .object({
    id: z.coerce.number().int().positive().optional(), // Used for updates
    optionText: z.string().trim().optional(),
    imageUrl: z.string().url().optional(),
    isCorrect: z.boolean().default(false),
  })
  .strict()
  .refine(data => data.optionText || data.imageUrl, {
    message: 'Either optionText or imageUrl must be provided',
    path: ['optionText'],
  });

export const createQuestionSchema = z
  .object({
    questionText: z.string().trim().min(1),
    imageUrl: z.string().url().optional(),
    marks: z.coerce.number().int().nonnegative().default(1),
    options: z.array(optionSchema).min(2).max(10), // A question should have 2-10 options
  })
  .strict();

export const testIdParamSchema = z.object({ testId: z.coerce.number().int().positive() }).strict();
export const questionIdParamSchema = z.object({ questionId: z.coerce.number().int().positive() }).strict();
export const liveClassIdParamSchema = z.object({ id: z.coerce.number().int().positive() }).strict();
