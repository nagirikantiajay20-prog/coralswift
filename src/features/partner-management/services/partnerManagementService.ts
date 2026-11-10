import { partnerEndpoints as e } from '@/config/endpoints'
import type { ApiDict } from '@/features/dashboard/types'
import { api } from '@/services/api/client'
import { toPartnerDetail } from '../utils/partners'
import type { ApiList, ListParams, OrgRow, StatusBody } from '../types'

export const partnerManagementService = {
  list: async (params: ListParams) => {
    const { data } = await api.get<ApiList<OrgRow>>(e.list, { params })
    return { rows: data.data ?? [], meta: data.meta }
  },
  detail: async (id: string) => toPartnerDetail((await api.get<ApiDict>(e.detail(id))).data.data),
  setStatus: (id: string, body: StatusBody) => api.post(e.status(id), body),
}
