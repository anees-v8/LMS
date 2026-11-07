import { z } from 'zod';

const phone = z.string().regex(/^\d{10,15}$/, 'Phone must be 10-15 digits');

// clientType is optional and defaults to 'mobile' in the service layer —
// the Flutter app is already live on users' phones sending {phone, password}
// only, so it can never be made required without breaking every installed
// copy. Only the web login page is updated to explicitly send 'web', which
// is what lets the backend restrict web login to coaching_admin without
// touching the mobile login path at all.
export const loginSchema = z
  .object({
    phone,
    password: z.string().min(6).max(100),
    clientType: z.enum(['web', 'mobile']).optional(),
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
