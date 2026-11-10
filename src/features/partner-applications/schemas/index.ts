import { z } from 'zod'
import { DOC_CATEGORIES, REVIEW_STATUSES, VERIFICATION_OUTCOMES } from '../types'

const text = (label: string, max = 5000) =>
  z.string().trim().min(1, `${label} is required`).max(max, `Maximum ${max} characters`)

export const noteSchema = z.object({ body: text('Note') })

export const infoRequestSchema = z.object({
  body: text('Message'),
  requested_categories: z.array(z.enum(DOC_CATEGORIES)).max(8),
})

/** Backend: `reason` is "required for decisions" (rejected / pilot_onboarding / scale_up). */
export const DECISION_STATUSES: string[] = ['rejected', 'pilot_onboarding', 'scale_up']

export const transitionSchema = z
  .object({
    to_status: z.string().min(1, 'Choose a stage'),
    reason: z.string().trim().max(2000),
    partner_note: z.string().trim().max(2000),
  })
  .refine((v) => !DECISION_STATUSES.includes(v.to_status) || v.reason.length > 0, {
    path: ['reason'],
    message: 'A reason is required to record a decision',
  })

const optNum = z
  .string()
  .trim()
  .refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0), 'Enter a number ≥ 0')

export const eligibilitySchema = z.object({
  outcome: z.enum(VERIFICATION_OUTCOMES),
  verified_operating_years: optNum,
  verified_personnel: optNum,
  verified_turnover_inr_crore: optNum,
  exception_note: z.string().trim().max(4000),
  notes: z.string().trim().max(4000),
})

export const docReviewSchema = z
  .object({
    status: z.enum(REVIEW_STATUSES),
    comment: z.string().trim().max(2000),
  })
  .refine((v) => v.status === 'accepted' || v.status === 'pending' || v.comment.length > 0, {
    path: ['comment'],
    message: 'A reason is required to reject or request clarification',
  })

export type NoteForm = z.infer<typeof noteSchema>
export type InfoRequestForm = z.infer<typeof infoRequestSchema>
export type TransitionForm = z.infer<typeof transitionSchema>
export type EligibilityForm = z.infer<typeof eligibilitySchema>
export type DocReviewForm = z.infer<typeof docReviewSchema>
