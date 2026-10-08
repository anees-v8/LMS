import { z } from 'zod';

const phone = z.string().regex(/^\d{10,15}$/, 'Phone must be 10-15 digits');

export const registerTenantSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    slug: z.string().trim().regex(/^[a-z0-9-]{2,60}$/, 'Slug: lowercase letters, digits, hyphens'),
    city: z.string().trim().max(80).optional(),
    contactPhone: phone.optional(),
    adminName: z.string().trim().min(2).max(120),
    adminPhone: phone,
    adminEmail: z.string().trim().email().max(120),
    adminPassword: z.string().min(6).max(100),
    plan: z.enum(['flat', 'per_student']).optional(),
    amount: z.coerce.number().int().min(0).max(1000000).optional(),
  })
  .strict();

export const suspendSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() }).strict();

export const expiringQuerySchema = z
  .object({
    days: z.coerce.number().int().positive().max(365).optional(),
  })
  .strict();

export const analyticsQuerySchema = z
  .object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
  })
  .strict();

export const broadcastToAdminsSchema = z
  .object({
    title: z.string().trim().min(2).max(150),
    body: z.string().trim().max(2000).optional(),
    // Institute city — omit to broadcast to every coaching_admin platform-wide.
    city: z.string().trim().max(80).optional(),
  })
  .strict();

export type RegisterTenantBody = z.infer<typeof registerTenantSchema>;
export type SuspendBody = z.infer<typeof suspendSchema>;
export type BroadcastToAdminsBody = z.infer<typeof broadcastToAdminsSchema>;
