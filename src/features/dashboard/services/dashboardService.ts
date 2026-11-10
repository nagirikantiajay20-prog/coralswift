import { endpoints } from '@/config/endpoints'
import { api } from '@/services/api/client'
import type { ApiDict, ApiList, DateRange, EnquiryRow, OrgRow, ReviewerApplication } from '../types'

const e = endpoints.dashboard
const dates = (r: DateRange) => ({ created_from: r.from, created_to: r.to })
/** Backend caps page_size at 100; one page is fetched and the UI flags possible truncation. */
export const PAGE_SIZE = 100

export const dashboardService = {
  overview: async () => (await api.get<ApiDict>(e.overview)).data.data ?? {},
  kpis: async (r: DateRange) =>
    (await api.get<ApiDict>(e.kpis, { params: dates(r) })).data.data ?? {},
  enquiries: async (r: DateRange) =>
    (
      await api.get<ApiList<EnquiryRow>>(e.enquiries, {
        params: { page_size: PAGE_SIZE, ...dates(r) },
      })
    ).data.data ?? [],
  activeOrganizations: async () =>
    (
      await api.get<ApiList<OrgRow>>(e.organizations, {
        params: { status: 'active', page_size: PAGE_SIZE },
      })
    ).data.data ?? [],
  applications: async () =>
    (
      await api.get<ApiList<ReviewerApplication>>(e.applications, {
        params: { page_size: PAGE_SIZE },
      })
    ).data.data ?? [],
}
