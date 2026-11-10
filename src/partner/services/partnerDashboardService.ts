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
  markNotificationRead: async (id: string) => {
    await api.post(E.notificationRead(id))
  },
  markAllNotificationsRead: async () => {
    await api.post(E.notificationsReadAll)
  },
  enquiries: () => list<Row>(E.enquiries),
  history: (appId: string) => list<HistoryItem>(E.applicationHistory(appId)),
  messages: (appId: string) => list<PartnerMessage>(E.messages(appId)),
}
