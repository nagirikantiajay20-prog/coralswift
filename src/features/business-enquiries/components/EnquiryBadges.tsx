import { StatusBadge } from '@/components/common/StatusBadge'
import { humanize } from '@/features/partner-applications/utils/format'
import type { EnquiryStatus, Priority } from '../types'
import { PRIORITY_TONE, STATUS_TONE } from '../utils/format'

export const EnquiryStatusBadge = ({ status }: { status: EnquiryStatus }) => (
  <StatusBadge label={humanize(status)} tone={STATUS_TONE[status] ?? 'neutral'} />
)
export const PriorityBadge = ({ priority }: { priority: Priority }) => (
  <StatusBadge label={humanize(priority)} tone={PRIORITY_TONE[priority] ?? 'neutral'} />
)
