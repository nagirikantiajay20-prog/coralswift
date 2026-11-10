import { z } from 'zod'

/** Mirrors SettingIn: `value` string, 1..200 characters. Whitespace-only is rejected. */
export const settingSchema = z.object({
  value: z.string().trim().min(1, 'A value is required').max(200, 'Maximum 200 characters'),
})
export type SettingForm = z.infer<typeof settingSchema>
