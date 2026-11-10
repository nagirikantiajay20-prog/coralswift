import { StatusBadge } from '@/components/common/StatusBadge'
import type { ReviewStatus } from '../types'
import { REVIEW_LABEL, STATUS_TONE } from '../utils/documents'

export const DocStatusBadge = ({ status }: { status: ReviewStatus | null }) =>
  status ? (
    <StatusBadge label={REVIEW_LABEL[status]} tone={STATUS_TONE[status]} />
  ) : (
    <StatusBadge label="Not uploaded" tone="neutral" />
  )
