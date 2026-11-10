import { z } from 'zod'

/** Mirrors OrgStatusIn.reason: minLength 1, maxLength 4000. */
export const statusChangeSchema = z.object({
  reason: z.string().trim().min(1, 'A reason is required').max(4000, 'Maximum 4000 characters'),
})
export type StatusChangeForm = z.infer<typeof statusChangeSchema>
