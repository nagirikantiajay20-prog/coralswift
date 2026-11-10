import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginValues = z.infer<typeof loginSchema>

export const forgotPasswordSchema = loginSchema.pick({ email: true })
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

// ponytail: min length is a client-side placeholder; the backend documents no password policy (it only requires 1-256 chars).
const password = z.string().min(8, 'Use at least 8 characters')

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
