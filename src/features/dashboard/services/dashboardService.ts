import { endpoints } from '@/config/endpoints'
import { fetchAll, MAX_PAGES, type Fetched } from '@/features/reports/utils/aggregate'
import { api } from '@/services/api/client'
import type { ApiDict, ApiList, DateRange, EnquiryRow, OrgRow, ReviewerApplication } from '../types'

const e = endpoints.dashboard
const dates = (r: DateRange) => ({ created_from: r.from, created_to: r.to })
/** Backend caps page_size at 100; lists are paged until complete, up to this many rows. */
export const PAGE_SIZE = 100
export const ROW_CAP = PAGE_SIZE * MAX_PAGES

/** Complete list or an explicitly `partial` one (ceiling hit); callers must show the latter as such. */
const all = <T>(url: string, params: object): Promise<Fetched<T>> =>
  fetchAll(async (page) => {
    const { data } = await api.get<ApiList<T>>(url, {
      params: { ...params, page, page_size: PAGE_SIZE },
    })
    return { rows: data.data ?? [], meta: data.meta ?? null }
  })

export const dashboardService = {
  overview: async () => (await api.get<ApiDict>(e.overview)).data.data ?? {},
  kpis: async (r: DateRange) =>
    (await api.get<ApiDict>(e.kpis, { params: dates(r) })).data.data ?? {},
  enquiries: (r: DateRange) => all<EnquiryRow>(e.enquiries, dates(r)),
  activeOrganizations: () => all<OrgRow>(e.organizations, { status: 'active' }),
  applications: () => all<ReviewerApplication>(e.applications, {}),
}
