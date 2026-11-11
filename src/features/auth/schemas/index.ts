import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginValues = z.infer<typeof loginSchema>

export const forgotPasswordSchema = loginSchema.pick({ email: true })
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

// Backend password policy (GET /admin/security-policy, 2026-11): minimum 12 characters.
const password = z.string().min(12, 'Use at least 12 characters')

const matches = (v: { password: string; confirmPassword: string }) =>
  v.password === v.confirmPassword
const mismatch = { path: ['confirmPassword'], message: 'Passwords do not match' }

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine(matches, mismatch)
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    password,
    confirmPassword: z.string(),
  })
  .refine(matches, mismatch)
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
