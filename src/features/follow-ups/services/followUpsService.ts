import { businessEnquiriesService as enq } from '@/features/business-enquiries/services/businessEnquiriesService'
import type { EnquiryListParams } from '@/features/business-enquiries/types'
import { partnerApplicationsService as apps } from '@/features/partner-applications/services/partnerApplicationsService'
import { metaTotal, visibleEnquiryTypes } from '../utils/followUps'

export interface Metric {
  value?: number
  failed?: boolean
}
export interface DiscussionMetrics {
  total: Metric
  open: Metric
  overdue: Metric
  pendingResponses: Metric
}

/** Exact counts from the backend's reported total (page_size=1): never derived from paginated rows. */
async function countEnquiries(f: Partial<EnquiryListParams>, canStrategic: boolean) {
  const types = canStrategic ? [undefined] : visibleEnquiryTypes(false)
  const totals = await Promise.all(
    types.map(async (type) =>
      metaTotal((await enq.list({ page: 1, page_size: 1, type, ...f })).meta),
    ),
  )
  if (totals.some((t) => t === undefined)) throw new Error('The backend did not report a total')
  return totals.reduce<number>((a, b) => a + (b ?? 0), 0)
}

const settle = (p: Promise<number>): Promise<Metric> =>
  p.then(
    (value) => ({ value }),
    () => ({ failed: true }),
  )

export const followUpsMetrics = {
  /**
   * Counts ENQUIRIES (the follow-up resource has no global list). "Pending responses" = partner
   * applications in `information_requested` (the only backend-provided awaiting-reply signal).
   */
  async load(canStrategic: boolean, canApplications: boolean): Promise<DiscussionMetrics> {
    const c = (f: Partial<EnquiryListParams>) => countEnquiries(f, canStrategic)
    const [total, received, inReview, overdue, pending] = await Promise.all([
      settle(c({})),
      settle(c({ status: 'received' })),
      settle(c({ status: 'in_review' })),
      settle(c({ overdue: true })),
      canApplications
        ? settle(
            apps.list({ page: 1, page_size: 1, status: 'information_requested' }).then((r) => {
              const t = metaTotal(r.meta)
              if (t === undefined) throw new Error('no total')
              return t
            }),
          )
        : Promise.resolve<Metric>({}),
    ])
    const open: Metric =
      received.value !== undefined && inReview.value !== undefined
        ? { value: received.value + inReview.value }
        : { failed: true }
    return { total, open, overdue, pendingResponses: pending }
  },
}
