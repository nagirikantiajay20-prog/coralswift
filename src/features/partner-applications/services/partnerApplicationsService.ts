import { reviewEndpoints as e } from '@/config/endpoints'
import { api } from '@/services/api/client'
import type {
  ApiList,
  ApiOne,
  AuditItem,
  EligibilityBody,
  ListParams,
  Message,
  Note,
  PortalStatus,
  ReviewDetail,
  Reviewer,
  ReviewerApplication,
} from '../types'

const unwrap = <T>(r: { data: { data: T | null } }) => r.data.data

export const partnerApplicationsService = {
  list: async (params: ListParams) => {
    const { data } = await api.get<ApiList<ReviewerApplication>>(e.list, { params })
    return { rows: data.data ?? [], meta: data.meta }
  },
  detail: async (id: string) => unwrap(await api.get<ApiOne<ReviewDetail>>(e.detail(id))),
  notes: async (id: string) => unwrap(await api.get<ApiList<Note>>(e.notes(id))) ?? [],
  messages: async (id: string) => unwrap(await api.get<ApiList<Message>>(e.messages(id))) ?? [],
  audit: async (id: string) => unwrap(await api.get<ApiList<AuditItem>>(e.history(id))) ?? [],
  reviewers: async () =>
    unwrap(
      await api.get<ApiList<Reviewer>>(e.reviewers, { params: { role: 'partner_reviewer' } }),
    ) ?? [],

  assign: (id: string, reviewer_id: string) => api.post(e.assign(id), { reviewer_id }),
  transition: (
    id: string,
    body: { to_status: PortalStatus; reason?: string; partner_note?: string },
  ) => api.post(e.transition(id), body),
  requestInfo: (id: string, body: { body: string; requested_categories: string[] }) =>
    api.post(e.infoRequests(id), body),
  recordEligibility: (id: string, body: EligibilityBody) => api.post(e.eligibility(id), body),
  addNote: (id: string, body: string) => api.post(e.notes(id), { body }),
  reviewDocument: (
    id: string,
    doc: string,
    body: { status: string; comment?: string; version_no?: number },
  ) => api.post(e.docReview(id, doc), body),

  /** Authenticated blob download (no public URLs exist); caller opens/saves the blob. */
  downloadDocument: async (id: string, doc: string, version?: number) =>
    (await api.get<Blob>(e.docDownload(id, doc), { params: { version }, responseType: 'blob' }))
      .data,
}
