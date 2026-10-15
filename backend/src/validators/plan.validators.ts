import { z } from 'zod';

const featureKeySchema = z.string().trim().min(1).max(50);

export const createPlanSchema = z.object({
  name: z.string().trim().min(2).max(40),
  tagline: z.string().trim().max(200).optional().nullable(),
  priceMonthly: z.number().int().min(0).max(1000000),
  priceQuarterly: z.number().int().min(0).max(1000000),
  priceYearly: z.number().int().min(0).max(1000000),
  flatTeacherLimit: z.number().int().min(0).max(10000).optional().default(0),
  features: z.array(featureKeySchema).min(1),
  displayOrder: z.number().int().min(0).max(1000).optional().nullable(),
});

export const updatePlanSchema = z.object({
  name: z.string().trim().min(2).max(40).optional(),
  tagline: z.string().trim().max(200).optional().nullable(),
  priceMonthly: z.number().int().min(0).max(1000000).optional(),
  priceQuarterly: z.number().int().min(0).max(1000000).optional(),
  priceYearly: z.number().int().min(0).max(1000000).optional(),
  flatTeacherLimit: z.number().int().min(0).max(10000).optional(),
  features: z.array(featureKeySchema).min(1).optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).max(1000).optional().nullable(),
});

export const assignPlanSchema = z.object({
  planCatalogId: z.number().int().positive(),
  billingCycle: z.enum(['monthly', 'quarterly', 'yearly']),
});

export type CreatePlanBody = z.infer<typeof createPlanSchema>;
export type UpdatePlanBody = z.infer<typeof updatePlanSchema>;
export type AssignPlanBody = z.infer<typeof assignPlanSchema>;

