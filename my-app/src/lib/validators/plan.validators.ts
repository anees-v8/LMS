import { z } from 'zod';

const featureKeySchema = z.enum([
  'student_management',
  'batch_management',
  'digital_attendance',
  'fee_management',
  'video_library',
  'whatsapp_reminders',
  'email_notifications',
  'live_classes',
  'performance_reports',
  'online_tests',
  'doubt_solving',
]);

export const createPlanSchema = z
  .object({
    name: z.string().trim().min(2).max(40),
    tagline: z.string().trim().max(200).optional(),
    priceMonthly: z.number().int().min(1).max(10000),
    priceQuarterly: z.number().int().min(1).max(10000),
    priceYearly: z.number().int().min(1).max(10000),
    flatTeacherLimit: z.number().int().min(0).max(10000),
    features: z.array(featureKeySchema).min(1),
    displayOrder: z.number().int().min(0).max(100).optional(),
  })
  .strict();

export const updatePlanSchema = z
  .object({
    tagline: z.string().trim().max(200).optional(),
    priceMonthly: z.number().int().min(1).max(10000).optional(),
    priceQuarterly: z.number().int().min(1).max(10000).optional(),
    priceYearly: z.number().int().min(1).max(10000).optional(),
    flatTeacherLimit: z.number().int().min(0).max(10000).optional(),
    features: z.array(featureKeySchema).min(1).optional(),
    isActive: z.boolean().optional(),
    displayOrder: z.number().int().min(0).max(100).optional(),
  })
  .strict();

export const assignPlanSchema = z
  .object({
    planCatalogId: z.number().int().positive(),
    billingCycle: z.enum(['monthly', 'quarterly', 'yearly']),
  })
  .strict();

export type CreatePlanBody = z.infer<typeof createPlanSchema>;
export type UpdatePlanBody = z.infer<typeof updatePlanSchema>;
export type AssignPlanBody = z.infer<typeof assignPlanSchema>;
