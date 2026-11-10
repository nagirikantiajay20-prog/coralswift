import { z } from 'zod'

export const inviteSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required').max(200, 'Maximum 200 characters'),
  email: z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email address')),
})
export type InviteForm = z.infer<typeof inviteSchema>
