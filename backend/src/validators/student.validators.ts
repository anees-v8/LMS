import { z } from 'zod';

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() }).strict();
export const paymentIdParamSchema = z.object({ paymentId: z.coerce.number().int().positive() }).strict();
export const subjectIdParamSchema = z.object({ subjectId: z.coerce.number().int().positive() }).strict();
export const chapterIdParamSchema = z.object({ chapterId: z.coerce.number().int().positive() }).strict();
export const testIdParamSchema = z.object({ testId: z.coerce.number().int().positive() }).strict();

export const listVideosQuerySchema = z
  .object({
    subjectId: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const askDoubtQuerySchema = z
  .object({
    teacherId: z.coerce.number().int().positive().optional(),
    chapter: z.string().trim().max(200).optional(),
  })
  .strict();

export const submitTestSchema = z.object({
  answers: z.record(z.string(), z.number().int().positive()),
});

export const scanAttendanceQrSchema = z.object({ token: z.string().trim().min(16).max(64) }).strict();

