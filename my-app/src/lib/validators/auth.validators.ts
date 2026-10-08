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
    avatarUrl: z.string().url(),
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

const otpCode = z.string().regex(/^\d{6}$/, 'Code must be 6 digits');
const newPassword = z.string().min(6).max(100);

export const forgotPasswordSchema = z.object({ phone }).strict();

export const resetPasswordSchema = z
  .object({
    phone,
    otp: otpCode,
    newPassword,
  })
  .strict();

export const requestEmailChangeSchema = z
  .object({
    newEmail: z.string().trim().email().max(120),
  })
  .strict();

export const confirmEmailChangeSchema = z
  .object({
    newEmail: z.string().trim().email().max(120),
    otp: otpCode,
  })
  .strict();

export const confirmPasswordChangeSchema = z
  .object({
    otp: otpCode,
    newPassword,
  })
  .strict();

export type LoginBody = z.infer<typeof loginSchema>;
export type RefreshBody = z.infer<typeof refreshSchema>;
export type UpdateAvatarBody = z.infer<typeof updateAvatarSchema>;
export type RegisterDeviceTokenBody = z.infer<typeof registerDeviceTokenSchema>;
