import { z } from 'zod'
import type { StatusTone } from '@/components/common/StatusBadge'
import { DELIVERY_STATUSES, type DeliveryStatus, type OutboxRow } from '../types'

export { metaTotal } from '@/features/partner-management/utils/partners'

export const isDeliveryStatus = (s: unknown): s is DeliveryStatus =>
  (DELIVERY_STATUSES as readonly unknown[]).includes(s)

/** `sent` means the provider accepted it; the backend exposes no "delivered" confirmation. */
export const STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: 'Pending',
  sent: 'Sent (accepted)',
  logged: 'Logged only',
  failed: 'Failed',
}
export const STATUS_TONE: Record<DeliveryStatus, StatusTone> = {
  pending: 'warning',
  sent: 'success',
  logged: 'neutral',
  failed: 'danger',
}

export interface Delivery {
  id: string
  type: string | null
  recipient: string | null
  subject: string | null
  status: DeliveryStatus | null
  createdAt: string | null
  attempts: number | null
  failure: string | null
  /** Strategic content is withheld from roles without strategic access. */
  restricted: boolean
}

const text = (r: OutboxRow, keys: string[]): string | null => {
  for (const k of keys) if (typeof r[k] === 'string' && r[k]) return r[k] as string
  return null
}

/**
 * Whitelist mapping: only these fields are ever read. Message bodies, payloads and any other key
 * are dropped. Rows flagged is_strategic are redacted unless `canSeeStrategic`.
 */
export function toDelivery(r: OutboxRow, canSeeStrategic: boolean): Delivery | null {
  if (typeof r.id !== 'string') return null
  const d: Delivery = {
    id: r.id,
    type: text(r, ['type', 'template_key', 'template', 'kind', 'event']),
    recipient: text(r, ['recipient', 'to', 'to_email', 'email']),
    subject: text(r, ['subject']),
    status: isDeliveryStatus(r.status) ? r.status : null,
    createdAt: text(r, ['created_at']),
    attempts: typeof r.attempts === 'number' ? r.attempts : null,
    failure: text(r, ['last_error', 'error', 'failure_reason']),
    restricted: false,
  }
  if (!canSeeStrategic && r.is_strategic === true) {
    return { ...d, subject: null, recipient: null, failure: null, restricted: true }
  }
  return d
}

export const toDeliveries = (rows: OutboxRow[], canSeeStrategic: boolean): Delivery[] =>
  rows.flatMap((r) => toDelivery(r, canSeeStrategic) ?? [])

/** Client-side text filter over the loaded page only (the backend filters by status alone). */
export const filterDeliveries = (rows: Delivery[], q: string): Delivery[] => {
  const s = q.trim().toLowerCase()
  if (!s) return rows
  return rows.filter((d) =>
    [d.type, d.recipient, d.subject].some((v) => v?.toLowerCase().includes(s)),
  )
}

/** Only failed emails may be retried (backend: "Reset a failed email"). */
export const canRetry = (d: Delivery) => d.status === 'failed'

/** Backend `TemplateIn` limits. Placeholder rules are enforced by the backend (422), not guessed here. */
export const templateSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required').max(200, 'Max 200 characters'),
  text_body: z.string().trim().min(1, 'Text body is required').max(20000, 'Max 20,000 characters'),
  html_body: z
    .string()
    .max(50000, 'Max 50,000 characters')
    .transform((v) => (v.trim() ? v : null)),
})

export type Support = 'verified' | 'missing'
export const CAPABILITIES: { operation: string; support: Support; detail: string }[] = [
  {
    operation: 'Email outbox list by status',
    support: 'verified',
    detail: 'GET /admin/notifications (pending, sent, logged, failed)',
  },
  {
    operation: 'Retry a failed email / dispatch eligible emails',
    support: 'verified',
    detail: 'POST /admin/notifications/{id}/retry, POST /admin/notifications/dispatch',
  },
  {
    operation: 'Template list, override, revert, preview',
    support: 'verified',
    detail: 'GET/PUT/DELETE /admin/notification-templates[/{key}], POST .../preview',
  },
  {
    operation: 'In-app admin notification feed (list, read, read-all, archive)',
    support: 'verified',
    detail: 'GET /admin/feed, POST /admin/feed/read-all, /{id}/read, /{id}/archive. No delete.',
  },
  {
    operation: 'Send an ad-hoc email, invitations by email, attachments',
    support: 'missing',
    detail: 'No send endpoint. Partner invitation is POST /reviewer/invitations (Phase 7/14).',
  },
  {
    operation: 'Create a template key / activate-deactivate / version history',
    support: 'missing',
    detail:
      'Keys are built in; override = active, revert = built-in. Only the current version number is returned.',
  },
  {
    operation: 'Template placeholder list',
    support: 'missing',
    detail: 'Not in the spec. The backend rejects disallowed placeholders on save/preview.',
  },
  {
    operation: 'Delivered / opened confirmation',
    support: 'missing',
    detail: 'Statuses stop at sent (accepted). No delivery receipts.',
  },
  {
    operation: 'Date-range / type / search filters, global counts, related-record links',
    support: 'missing',
    detail: 'Outbox filters by status only; counts come from meta.total per status.',
  },
  {
    operation: 'Per-record communication history',
    support: 'missing',
    detail:
      'No endpoint by record. Application messages (Phase 6) and enquiry follow-ups (Phase 11) stay on their own screens.',
  },
  { operation: 'Notification preferences', support: 'missing', detail: 'No endpoint.' },
  {
    operation: 'Automated notification trigger configuration',
    support: 'missing',
    detail: 'Not exposed.',
  },
]
