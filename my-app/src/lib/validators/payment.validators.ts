import { z } from 'zod';

export const verifyPaymentSchema = z
  .object({
    orderId: z.string().min(3),
    paymentId: z.string().min(3),
    signature: z.string().min(3).optional(), // optional only for dev mock orders
  })
  .strict();

export type VerifyPaymentBody = z.infer<typeof verifyPaymentSchema>;

const billingCycleSchema = z.enum(['monthly', 'quarterly', 'yearly']);

export const quotePlanChangeSchema = z
  .object({
    planCatalogId: z.number().int().positive(),
    billingCycle: billingCycleSchema,
    studentCount: z.number().int().positive().max(1000000).optional(),
  })
  .strict();

export const requestPlanChangeSchema = quotePlanChangeSchema;

export const confirmPlanChangeSchema = z
  .object({
    planCatalogId: z.number().int().positive(),
    billingCycle: billingCycleSchema,
    studentCount: z.number().int().positive().max(1000000).optional(),
    orderId: z.string().min(3),
    paymentId: z.string().min(3).optional(),
    signature: z.string().min(3).optional(),
  })
  .strict();

export type QuotePlanChangeBody = z.infer<typeof quotePlanChangeSchema>;
export type ConfirmPlanChangeBody = z.infer<typeof confirmPlanChangeSchema>;
