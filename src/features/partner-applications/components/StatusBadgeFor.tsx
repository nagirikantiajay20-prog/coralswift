import { StatusBadge } from '@/components/common/StatusBadge'
import type { PortalStatus } from '../types'
import { humanize, STATUS_TONE } from '../utils/format'

export const ApplicationStatusBadge = ({ status }: { status: PortalStatus }) => (
  <StatusBadge label={humanize(status)} tone={STATUS_TONE[status] ?? 'neutral'} />
)
