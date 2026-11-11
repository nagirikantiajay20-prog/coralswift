import { downloadCsv as csv } from '@/services/api/csv'
import { businessEnquiriesService as enq } from '@/features/business-enquiries/services/businessEnquiriesService'
import type { EnquiryListParams, EnquiryRow } from '@/features/business-enquiries/types'
import { communicationService } from '@/features/communication/services/communicationService'
import type { DeliveryStatus } from '@/features/communication/types'
import { dashboardService } from '@/features/dashboard/services/dashboardService'
import { partnerApplicationsService as apps } from '@/features/partner-applications/services/partnerApplicationsService'
import type { PortalStatus } from '@/features/partner-applications/types'
import { partnerManagementService as orgs } from '@/features/partner-management/services/partnerManagementService'
import { metaTotal } from '@/features/partner-management/utils/partners'
import { fetchAll, PAGE, type Fetched } from '../utils/aggregate'
import type { EnquiryScope, Metric } from '../types'

/** Verified in openapi.json (fetched 2026-11-10). Both are audited, capped server-side at 10,000 rows. */
const CSV = {
  enquiries: '/api/v1/admin/reports/enquiries.csv',
  applications: '/api/v1/admin/reports/applications.csv',
  newsletter: '/api/v1/admin/reports/newsletter.csv',
}

/** Exact count = the backend-reported total of a one-row page. Never derived from a page of rows. */
async function total(p: Promise<{ meta: Record<string, unknown> | null }>) {
  const t = metaTotal((await p).meta)
  if (t === undefined) throw new Error('The backend did not report a total')
  return t
}

/** Runs each count independently so one failure shows "unavailable" for that metric only. */
export async function settleMetrics(
  entries: [key: string, label: string, run: () => Promise<number>][],
): Promise<Metric[]> {
  return Promise.all(
    entries.map(([key, label, run]) =>
      run().then(
        (value): Metric => ({ key, label, value }),
        (): Metric => ({ key, label, failed: true }),
      ),
    ),
  )
}

/** Sums over the scoped enquiry types (strategic is only ever included when the caller passes it). */
export const enquiryCount = async (s: EnquiryScope, extra: Partial<EnquiryListParams> = {}) =>
  (
    await Promise.all(
      s.types.map((type) =>
        total(
          enq.list({
            page: 1,
            page_size: 1,
            type,
            status: s.status,
            created_from: s.range.from,
            created_to: s.range.to,
            ...extra,
          }),
        ),
      ),
    )
  ).reduce((a, b) => a + b, 0)

export async function enquiryRows(s: EnquiryScope): Promise<Fetched<EnquiryRow>> {
  const parts = await Promise.all(
    s.types.map((type) =>
      fetchAll((page) =>
        enq.list({
          page,
          page_size: PAGE,
          type,
          status: s.status,
          created_from: s.range.from,
          created_to: s.range.to,
        }),
      ),
    ),
  )
  const totals = parts.map((p) => p.total)
  return {
    rows: parts.flatMap((p) => p.rows),
    total: totals.every((t) => t !== undefined)
      ? totals.reduce<number>((a, b) => a + (b ?? 0), 0)
      : undefined,
    partial: parts.some((p) => p.partial),
  }
}

export const reportsService = {
  applicationCount: (status?: PortalStatus, unassigned?: boolean) =>
    total(apps.list({ page: 1, page_size: 1, status, unassigned })),
  applicationRows: () => fetchAll((page) => apps.list({ page, page_size: PAGE })),
  orgCount: (status?: 'active' | 'suspended') =>
    total(orgs.list({ page: 1, page_size: 1, status })),
  orgRows: () => fetchAll((page) => orgs.list({ page, page_size: PAGE })),
  outboxCount: (status: DeliveryStatus) =>
    total(communicationService.outbox({ status, page: 1, page_size: 1 })),
  /** Backend-computed KPIs (untyped dict); scalar entries are shown exactly as reported. */
  kpis: (r: { from?: string; to?: string }) => dashboardService.kpis(r),

  /** Streams the backend CSV (audited, authorization enforced server-side) to a file download. */
  async downloadCsv(
    kind: keyof typeof CSV,
    params: Record<string, string | undefined>,
    filename: string,
  ) {
    await csv(CSV[kind], params, filename)
  },
}
