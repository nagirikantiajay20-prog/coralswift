import { partnerEndpoints as E } from '../config/endpoints'
import { api } from '@/services/api/client'
import type { PartnerDocument, PartnerMessage } from './partnerDocumentService'

export type { PartnerDocument, PartnerMessage }

/**
 * Types mirror openapi.json (2026-11-10) schemas: ApplicationOut, CompletionOut, DocumentOut,
 * PartnerHistoryItem, PartnerMessageOut. Notifications/enquiries are untyped dict rows in the spec,
 * so they stay `Row` and are read defensively (see `field`). No organization id is ever sent: the
 * backend derives it from the token.
 */
export type Row = Record<string, unknown>
export interface PartnerApplication {
  id: string
  reference: string
  status: string
  status_label: string
  pathway?: string
  cover_note?: string | null
  submission_count: number
  submitted_at: string | null
  open_information_requests: number
}
export interface Completion {
  percent: number
  missing_fields: string[]
  complete: boolean
}
export interface Readiness {
  complete: boolean
  missing_profile_fields: string[]
  missing_document_categories: string[]
}
export interface HistoryItem {
  from_status?: string | null
  to_status: string
  to_label: string
  note: string | null
  created_at: string
}
const list = async <T>(url: string, params?: object): Promise<T[]> =>
  (await api.get<{ data: T[] | null }>(url, { params })).data.data ?? []

export const partnerDashboardService = {
  applications: () => list<PartnerApplication>(E.applications),
  completion: async () =>
    (await api.get<{ data: Completion | null }>(E.completion)).data.data ?? null,
  documents: () => list<PartnerDocument>(E.documents),
  notifications: () => list<Row>(E.notifications, { page: 1, page_size: 5 }),
  notificationsPage: (page: number, size: number) =>
    list<Row>(E.notifications, { page, page_size: size }),
  /** GET /partner/notifications/unread-count -> { unread: integer }; anything else counts as 0. */
  unreadCount: async () => {
    const d = (await api.get<{ data: { unread?: unknown } | null }>(E.notificationsUnreadCount))
      .data.data
    return typeof d?.unread === 'number' && d.unread > 0 ? d.unread : 0
  },
  markNotificationRead: async (id: string) => {
    await api.post(E.notificationRead(id))
  },
  markNotificationUnread: async (id: string) => {
    await api.post(E.notificationUnread(id))
  },
  markAllNotificationsRead: async () => {
    await api.post(E.notificationsReadAll)
  },
  enquiries: () => list<Row>(E.enquiries),
  history: (appId: string) => list<HistoryItem>(E.applicationHistory(appId)),
  messages: (appId: string) => list<PartnerMessage>(E.messages(appId)),
  /** GET .../readiness -> ReadinessOut: what is still missing before submit. */
  readiness: async (appId: string) =>
    (await api.get<{ data: Readiness | null }>(E.readiness(appId))).data.data,
  /** POST /partner/applications: DraftIn { pathway (required), cover_note? 1..4000 } -> ApplicationOut. */
  create: async (body: { pathway: string; cover_note?: string }) =>
    (await api.post<{ data: PartnerApplication | null }>(E.applications, body)).data.data,
  /** PATCH (draft): DraftUpdate { pathway?, cover_note? 1..4000 }. */
  updateDraft: async (appId: string, body: { pathway?: string; cover_note?: string }) =>
    (await api.patch<{ data: PartnerApplication | null }>(E.application(appId), body)).data.data,
  submit: async (appId: string) =>
    (await api.post<{ data: PartnerApplication | null }>(E.submit(appId))).data.data,
  resubmit: async (appId: string) =>
    (await api.post<{ data: PartnerApplication | null }>(E.resubmit(appId))).data.data,
  /** WithdrawIn { note? 1..4000 }. */
  withdraw: async (appId: string, note?: string) =>
    (await api.post<{ data: PartnerApplication | null }>(E.withdraw(appId), note ? { note } : {}))
      .data.data,
}
