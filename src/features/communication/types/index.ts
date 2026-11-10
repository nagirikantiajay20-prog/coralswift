/** Backend `DeliveryStatus` enum (openapi.json). No other delivery statuses exist. */
export const DELIVERY_STATUSES = ['pending', 'sent', 'logged', 'failed'] as const
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]

export interface ApiList<T> {
  data: T[] | null
  meta: Record<string, unknown> | null
}

/** Outbox rows are untyped dicts in the spec: every field is read defensively (see utils). */
export type OutboxRow = Record<string, unknown>

export interface OutboxParams {
  status: DeliveryStatus
  page: number
  page_size: number
}

/** Backend `TemplateOut`. Built-in (not customised) templates have null text. */
export interface Template {
  key: string
  customised: boolean
  version: number | null
  subject: string | null
  text_body: string | null
  html_body: string | null
}

/** Backend `TemplateIn`. */
export interface TemplateBody {
  subject: string
  text_body: string
  html_body: string | null
}
