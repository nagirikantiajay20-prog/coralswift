import { z } from 'zod'
import { ROLES } from '@/config/permissions'

const roles = Object.keys(ROLES) as [keyof typeof ROLES, ...(keyof typeof ROLES)[]]

/** Mirrors StaffInviteIn: email, full_name 1..150, role in StaffRole. No password field exists or is collected. */
export const staffInviteSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required').max(150, 'Maximum 150 characters'),
  email: z.email('Enter a valid email address'),
  role: z.enum(roles, { error: 'Select a role' }),
})
export type StaffInviteForm = z.infer<typeof staffInviteSchema>

export const roleChangeSchema = (current: string | null) =>
  z.object({
    role: z
      .enum(roles, { error: 'Select a role' })
      .refine((r) => r !== current, 'Choose a different role'),
  })
