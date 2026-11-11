import { api } from '@/services/api/client'
import { businessEnquiriesService as enq } from '@/features/business-enquiries/services/businessEnquiriesService'
import type { EnquiryListParams } from '@/features/business-enquiries/types'
import { partnerApplicationsService as apps } from '@/features/partner-applications/services/partnerApplicationsService'
import type { PortalStatus } from '@/features/partner-applications/types'
import type { AssignCategory, AssignRecord, CategoryCounts } from '../types'
import { CATEGORIES, fromApplication, fromEnquiry } from '../utils/assignment'

/** Filters the backend supports per resource. Applications: status + unassigned only. */
export interface LeadFilters {
  status?: string
  priority?: string
  unassigned?: boolean
  assignedUserId?: string
  overdue?: boolean
  q?: string
  from?: string
  to?: string
}

const total = (meta: Record<string, unknown> | null) => {
  const v = meta?.total ?? meta?.total_count
  return typeof v === 'number' ? v : undefined
}

const enquiryParams = (
  category: AssignCategory,
  f: LeadFilters,
  page: number,
  size: number,
): EnquiryListParams => ({
  page,
  page_size: size,
  type: CATEGORIES.find((c) => c.key === category)?.enquiryType,
  status: f.status as EnquiryListParams['status'],
  priority: f.priority as EnquiryListParams['priority'],
  unassigned: f.unassigned || undefined,
  assigned_user_id: f.assignedUserId,
  overdue: f.overdue || undefined,
  q: f.q,
  created_from: f.from,
  created_to: f.to,
})

async function list(category: AssignCategory, f: LeadFilters, page: number, size: number) {
  if (category === 'applications') {
    const r = await apps.list({
      page,
      page_size: size,
      status: f.status as PortalStatus | undefined,
      unassigned: f.unassigned || undefined,
    })
    return { records: r.rows.map(fromApplication) as AssignRecord[], meta: r.meta }
  }
  const r = await enq.list(enquiryParams(category, f, page, size))
  return { records: r.rows.map((x) => fromEnquiry(x, category)), meta: r.meta }
}

/** Thin adapter over the Phase 5 / 8 / 9 services: no new endpoints, no merged resources. */
export interface WorkloadRow {
  assignee_id: string | null
  assignee_name: string | null
  open_enquiries: number
  overdue_follow_ups: number
  sla_breached: number
}
export interface WorkloadData {
  rows: WorkloadRow[]
  totals: Omit<WorkloadRow, 'assignee_id' | 'assignee_name'>
}

export const leadAssignmentService = {
  list,

  /** GET /admin/workload: open enquiry counts per assignee (null assignee = unassigned). No capacity limits. */
  async workload() {
    return (await api.get<{ data: WorkloadData }>('/api/v1/admin/workload')).data.data
  },

  /** Exact counts from the backend's reported total (page_size=1), never from partial pages. */
  async counts(category: AssignCategory, me: string): Promise<CategoryCounts> {
    const t = async (f: LeadFilters) => total((await list(category, f, 1, 1)).meta)
    if (category === 'applications') {
      const [all, un] = await Promise.all([t({}), t({ unassigned: true })])
      return { total: all, unassigned: un }
    }
    const [all, un, mine, od] = await Promise.all([
      t({}),
      t({ unassigned: true }),
      t({ assignedUserId: me }),
      t({ overdue: true }),
    ])
    return { total: all, unassigned: un, mine, overdue: od }
  },

  /** Staff directory used only to show names. GET /admin/assignees, any staff role. */
  async staffNames() {
    const lists = await Promise.allSettled([enq.staff('enquiries'), enq.staff('applications')])
    const m = new Map<string, string>()
    for (const l of lists) {
      if (l.status === 'fulfilled') for (const s of l.value) m.set(s.id, s.full_name)
    }
    return m
  },
}
