import { enquiryEndpoints as e } from '@/config/endpoints'
import { api } from '@/services/api/client'
import type {
  ApiList,
  ApiOne,
  EnquiryDetail,
  EnquiryListParams,
  EnquiryRow,
  EnquiryStatus,
  FollowUp,
  Priority,
  StaffUser,
} from '../types'

export const businessEnquiriesService = {
  list: async (params: EnquiryListParams) => {
    const { data } = await api.get<ApiList<EnquiryRow>>(e.list, { params })
    return { rows: data.data ?? [], meta: data.meta }
  },
  detail: async (id: string) => (await api.get<ApiOne<EnquiryDetail>>(e.detail(id))).data.data,
  update: (id: string, body: { status?: EnquiryStatus; priority?: Priority }) =>
    api.patch(e.detail(id), body),
  assign: (id: string, user_id: string | null) => api.post(e.assign(id), { user_id }),
  addFollowUp: (id: string, body: { note: string; due_at?: string }) =>
    api.post<ApiOne<FollowUp>>(e.followUps(id), body),
  confirmMeeting: (
    id: string,
    b: { start: string; end: string; calendar_checked: true; note?: string },
  ) => api.post(e.meeting(id, 'confirm'), b),
  closeMeeting: (id: string, a: 'decline' | 'cancel', reason: string) =>
    api.post(e.meeting(id, a), { reason }),
  completeFollowUp: (id: string, fu: string) => api.post(e.completeFollowUp(id, fu)),
  /** Super administrator only (GET /admin/users). */
  staff: async (role: string) =>
    (await api.get<ApiList<StaffUser>>(e.users, { params: { role } })).data.data ?? [],
  /** Authenticated, audited blob download; the caller opens it from an object URL and never stores it. */
  download: async (id: string, doc: string) =>
    (await api.get<Blob>(e.download(id, doc), { responseType: 'blob' })).data,
}
