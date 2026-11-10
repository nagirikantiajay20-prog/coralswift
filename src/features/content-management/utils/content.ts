import { z } from 'zod'
import type { StatusTone } from '@/components/common/StatusBadge'
import type { ContentAction } from '@/config/endpoints'
import type { Role } from '@/config/permissions'
import type {
  AdminContent,
  ClaimCategory,
  ClaimStatus,
  ContentInput,
  ContentPatch,
  ContentStatus,
  ContentType,
} from '../types'

export { metaTotal } from '@/features/partner-management/utils/partners'

export const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  approved: 'Approved (not yet published)',
  published: 'Published',
  archived: 'Archived',
}
export const STATUS_TONE: Record<ContentStatus, StatusTone> = {
  draft: 'neutral',
  in_review: 'info',
  approved: 'warning',
  published: 'success',
  archived: 'neutral',
}
export const TYPE_LABEL: Record<ContentType, string> = {
  article: 'Article',
  faq: 'FAQ',
  page: 'Page',
  resource: 'Resource',
}
export const CLAIM_CATEGORY_LABEL: Record<ClaimCategory, string> = {
  company: 'Company',
  geography: 'Geography',
  partner_reference: 'Partner reference',
  project: 'Project',
  certification: 'Certification',
  testimonial: 'Testimonial',
  other: 'Other',
}
export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  verified: 'Verified',
  pending_verification: 'Pending verification',
  illustrative: 'Illustrative',
  prohibited: 'Prohibited',
}
export const CLAIM_STATUS_TONE: Record<ClaimStatus, StatusTone> = {
  verified: 'success',
  pending_verification: 'warning',
  illustrative: 'info',
  prohibited: 'danger',
}

// ---- validation (limits copied from ContentIn / ContentUpdate in openapi.json) ----
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const TAG_RE = /^[a-z0-9-]+$/

export const slugSchema = z
  .string()
  .min(2, 'Slug must be at least 2 characters')
  .max(120, 'Slug must be at most 120 characters')
  .regex(SLUG_RE, 'Use lowercase letters, numbers and single hyphens (e.g. about-us)')

/** Lowercase, hyphenate, strip anything the backend slug pattern rejects. */
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)

export const parseTags = (s: string): string[] => [
  ...new Set(
    s
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  ),
]

export const contentFormSchema = z.object({
  slug: slugSchema,
  content_type: z.enum(['article', 'faq', 'page', 'resource']),
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  summary: z.string().max(500, 'Summary must be at most 500 characters'),
  body: z
    .string()
    .trim()
    .min(1, 'Body is required')
    .max(100000, 'Body must be at most 100,000 characters'),
  category: z.string().max(80, 'Category must be at most 80 characters'),
  tags: z.string().superRefine((v, ctx) => {
    const t = parseTags(v)
    if (t.length > 15) ctx.addIssue({ code: 'custom', message: 'At most 15 tags' })
    const bad = t.find((x) => x.length > 40 || !TAG_RE.test(x))
    if (bad) {
      ctx.addIssue({
        code: 'custom',
        message: `Tag “${bad}”: lowercase letters, numbers, hyphens, max 40`,
      })
    }
  }),
  claim_ids: z.string().array().max(50, 'At most 50 claims'),
})
export type ContentFormValues = z.infer<typeof contentFormSchema>

export const EMPTY_FORM: ContentFormValues = {
  slug: '',
  content_type: 'page',
  title: '',
  summary: '',
  body: '',
  category: '',
  tags: '',
  claim_ids: [],
}

export const toForm = (c: AdminContent): ContentFormValues => ({
  slug: c.slug,
  content_type: c.content_type,
  title: c.title,
  summary: c.summary ?? '',
  body: c.body,
  category: c.category ?? '',
  tags: c.tags.join(', '),
  claim_ids: c.claim_ids,
})

/** Form -> API payload. Empty optional strings become null; nothing else is added. */
export const toInput = (v: ContentFormValues): ContentInput => ({
  slug: v.slug,
  content_type: v.content_type,
  title: v.title.trim(),
  summary: v.summary.trim() || null,
  body: v.body,
  category: v.category.trim() || null,
  tags: parseTags(v.tags),
  claim_ids: v.claim_ids,
})
/** PATCH payload: slug and content_type are not editable (absent from ContentUpdate). */
export const toPatch = (v: ContentFormValues): ContentPatch => {
  const input = toInput(v)
  return {
    title: input.title,
    summary: input.summary,
    body: input.body,
    category: input.category,
    tags: input.tags,
    claim_ids: input.claim_ids,
  }
}

/** True when the form differs from the saved values (drives the unsaved-changes warning). */
export const isDirty = (a: ContentFormValues, b: ContentFormValues) =>
  JSON.stringify(toInput(a)) !== JSON.stringify(toInput(b))

// ---- workflow ----
/** Backend: only drafts can be edited or have an attachment replaced. */
export const isEditable = (s: ContentStatus) => s === 'draft'

export interface WorkflowAction {
  action: ContentAction
  label: string
  confirm: string
  destructive?: boolean
  note?: 'optional' | 'required'
  /** Documented by the backend as super administrator only. */
  superOnly?: boolean
}
const A: Record<ContentAction, WorkflowAction> = {
  submit: {
    action: 'submit',
    label: 'Submit for review',
    confirm: 'Send this draft to review? It cannot be edited while in review.',
  },
  approve: {
    action: 'approve',
    label: 'Approve',
    confirm: 'Approve this content? Approval does not publish it.',
    note: 'optional',
    superOnly: true,
  },
  reject: {
    action: 'reject',
    label: 'Reject',
    confirm: 'Return this content to draft with a note for the author.',
    note: 'required',
    superOnly: true,
    destructive: true,
  },
  publish: {
    action: 'publish',
    label: 'Publish',
    confirm:
      'Publish this content to the public website? It is only live once the server confirms.',
  },
  unpublish: {
    action: 'unpublish',
    label: 'Unpublish',
    confirm: 'Remove this content from the public website?',
    destructive: true,
  },
  reopen: {
    action: 'reopen',
    label: 'Reopen as draft',
    confirm: 'Return this content to draft for editing? It is removed from the public site.',
    destructive: true,
  },
  archive: {
    action: 'archive',
    label: 'Archive',
    confirm: 'Archive this content? The backend decides whether archiving is allowed from here.',
    destructive: true,
  },
}
/**
 * Actions offered per status, from the endpoint summaries (draft->in_review, in_review->approved
 * or draft, approved->published, unpublish, reopen, archive). The backend validates every
 * transition (409) and role (403); this only avoids offering documented-impossible actions.
 */
const BY_STATUS: Record<ContentStatus, ContentAction[]> = {
  draft: ['submit', 'archive'],
  in_review: ['approve', 'reject'],
  approved: ['publish', 'reopen'],
  published: ['unpublish', 'reopen', 'archive'],
  archived: [],
}
export const actionsFor = (status: ContentStatus, role: Role | undefined): WorkflowAction[] =>
  BY_STATUS[status].map((a) => A[a]).filter((a) => !a.superOnly || role === 'super_administrator')

/** Reject needs a note (min 1); approve's is optional; both max 4000. */
export function validateNote(a: WorkflowAction, note: string): string | null {
  const n = note.trim()
  if (a.note === 'required' && !n) return 'A note is required.'
  if (n.length > 4000) return 'Note must be at most 4000 characters.'
  return null
}

// ---- attachment (draft only; 413/415 limits are not in the spec, so the backend decides) ----
export function validateAttachment(file: File | null, label: string): string | null {
  if (!file) return 'Choose a file.'
  if (file.size === 0) return 'The file is empty.'
  if (label.length > 40) return 'Version label must be at most 40 characters.'
  return null
}
export const formatBytes = (n: number | null) =>
  n == null
    ? '—'
    : n < 1024
      ? `${n} B`
      : n < 1048576
        ? `${(n / 1024).toFixed(1)} KB`
        : `${(n / 1048576).toFixed(1)} MB`

export const claimSchema = z.object({
  claim_text: z
    .string()
    .trim()
    .min(1, 'Claim text is required')
    .max(4000, 'At most 4000 characters'),
  category: z.enum([
    'company',
    'geography',
    'partner_reference',
    'project',
    'certification',
    'testimonial',
    'other',
  ]),
  evidence_ref: z.string().max(300, 'At most 300 characters'),
})

/** Backend support vs. the brief. Shown on the dashboard; nothing unsupported is simulated. */
export const CAPABILITIES: { name: string; supported: boolean; note: string }[] = [
  {
    name: 'Content items (article, FAQ, page, resource)',
    supported: true,
    note: '/admin/content',
  },
  {
    name: 'Draft, review, approval, publish, unpublish, archive',
    supported: true,
    note: 'Statuses: draft, in_review, approved, published, archived',
  },
  {
    name: 'Version history',
    supported: true,
    note: 'Title, summary, body, editor and time per version',
  },
  {
    name: 'Downloadable attachment (draft only)',
    supported: true,
    note: 'POST /admin/content/{id}/attachment',
  },
  {
    name: 'Public claims register and verification',
    supported: true,
    note: '/admin/content-claims',
  },
  { name: 'Scheduled publication', supported: false, note: 'No scheduling endpoint or status' },
  { name: 'Homepage, hero banners, promotions', supported: false, note: 'No such resource' },
  {
    name: 'Services and industries content',
    supported: false,
    note: 'No dedicated endpoints; only generic content items',
  },
  {
    name: 'Media library, image upload, replace, delete',
    supported: false,
    note: 'No media API; the only upload is a content attachment',
  },
  {
    name: 'SEO metadata (title, description, canonical, Open Graph)',
    supported: false,
    note: 'Not stored. Only slug, summary, category and tags exist',
  },
  { name: 'Navigation menus', supported: false, note: 'No menu endpoint' },
  {
    name: 'Approval and publication audit trail',
    supported: false,
    note: 'Only versions, review_note and last_reviewed_at',
  },
]
