import { z } from 'zod';

const phone = z.string().regex(/^\d{10,15}$/, 'Phone must be 10-15 digits');

export const loginSchema = z
  .object({
    phone,
    password: z.string().min(6).max(100),
  })
  .strict();

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(10),
  })
  .strict();

export const updateAvatarSchema = z
  .object({
    avatarUrl: z.string().url().nullable(),
  })
  .strict();

export const registerDeviceTokenSchema = z
  .object({
    token: z.string().min(10),
    platform: z.enum(['android', 'ios']),
  })
  .strict();

export const unregisterDeviceTokenSchema = z
  .object({
    token: z.string().min(10),
  })
  .strict();

export type LoginBody = z.infer<typeof loginSchema>;
export type RefreshBody = z.infer<typeof refreshSchema>;
export type UpdateAvatarBody = z.infer<typeof updateAvatarSchema>;
export type RegisterDeviceTokenBody = z.infer<typeof registerDeviceTokenSchema>;
