import { partnerEndpoints as e } from '@/config/endpoints'
import type { ApiDict } from '@/features/dashboard/types'
import { api } from '@/services/api/client'
import { toPartnerDetail } from '../utils/partners'
import type { ApiList, ListParams, OrgRow, StatusBody } from '../types'

/** Backend RevisionRow / OrgActivityRow (GET /admin/organizations/{id}/revisions | activity). */
export interface OrgRevision {
  version: number
  changed_by: string
  changed_by_name: string | null
  changes: Record<string, unknown>
  created_at: string
}
export interface OrgActivity {
  id: string
  record_type: string
  action: string
  actor_name: string | null
  meta: Record<string, unknown>
  created_at: string
}

export const partnerManagementService = {
  revisions: async (id: string) =>
    (
      await api.get<{ data: OrgRevision[] | null }>(e.revisions(id), {
        params: { page: 1, page_size: 50 },
      })
    ).data.data ?? [],
  activity: async (id: string) =>
    (
      await api.get<{ data: OrgActivity[] | null }>(e.activity(id), {
        params: { page: 1, page_size: 50 },
      })
    ).data.data ?? [],
  list: async (params: ListParams) => {
    const { data } = await api.get<ApiList<OrgRow>>(e.list, { params })
    return { rows: data.data ?? [], meta: data.meta }
  },
  detail: async (id: string) => toPartnerDetail((await api.get<ApiDict>(e.detail(id))).data.data),
  setStatus: (id: string, body: StatusBody) => api.post(e.status(id), body),
}
