import { z } from 'zod'

/** Backend FollowUpIn: note <= 4000 chars, optional due_at. */
export const followUpSchema = z.object({
  note: z.string().trim().min(1, 'A note is required').max(4000, 'Maximum 4000 characters'),
  due: z.string().refine((v) => !v || !Number.isNaN(Date.parse(v)), 'Enter a valid date'),
})
export type FollowUpForm = z.infer<typeof followUpSchema>

/** Backend MeetingConfirmIn: staff must confirm the calendar was really checked; end after start. */
export const meetingConfirmSchema = z
  .object({
    start: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Enter a start date and time'),
    end: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Enter an end date and time'),
    calendar_checked: z
      .boolean()
      .refine((v) => v, 'Confirm that calendar availability was checked'),
    note: z.string().trim().max(4000, 'Maximum 4000 characters'),
  })
  .refine((v) => Date.parse(v.end) > Date.parse(v.start), {
    path: ['end'],
    message: 'End must be after start',
  })
export type MeetingConfirmForm = z.infer<typeof meetingConfirmSchema>

/** Backend ReasonIn for decline / cancel. */
export const reasonSchema = z.object({
  reason: z.string().trim().min(1, 'A reason is required').max(4000, 'Maximum 4000 characters'),
})
export type ReasonForm = z.infer<typeof reasonSchema>
