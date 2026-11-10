import { useState } from 'react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/states'
import { StatusBadge, type StatusTone } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useEnquiryMutation } from '@/features/business-enquiries/hooks/useEnquiries'
import { businessEnquiriesService as svc } from '@/features/business-enquiries/services/businessEnquiriesService'
import type { FollowUp } from '@/features/business-enquiries/types'
import { formatDate, formatDateTime, shortId } from '@/features/partner-applications/utils/format'
import { entryLabel, followUpState, type FollowUpState } from '../utils/followUps'

const STATE: Record<FollowUpState, { label: string; tone: StatusTone }> = {
  completed: { label: 'Completed', tone: 'success' },
  overdue: { label: 'Overdue', tone: 'danger' },
  open: { label: 'Open', tone: 'warning' },
  note: { label: 'Note', tone: 'neutral' },
}

/**
 * Internal enquiry notes and follow-ups (one backend mechanism: `note` + optional `due_at`).
 * The only supported transition is open -> completed; the backend has no cancel, reschedule or
 * follow-up reassignment, so none is offered.
 */
export function FollowUpList({ enquiryId, items }: { enquiryId: string; items: FollowUp[] }) {
  const { user } = useAuth()
  const [target, setTarget] = useState<FollowUp | null>(null)
  const done = useEnquiryMutation(
    (id: string) => svc.completeFollowUp(enquiryId, id),
    'Follow-up completed',
  )
  if (!items.length) return <EmptyState title="No notes or follow-ups yet" />
  return (
    <>
      <ul className="space-y-3">
        {[...items]
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((f) => {
            const st = followUpState(f)
            return (
              <li key={f.id} className="rounded border border-line p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={entryLabel(f)} tone="info" />
                  <StatusBadge label={STATE[st].label} tone={STATE[st].tone} />
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words">{f.note}</p>
                <p className="mt-2 text-xs text-muted">
                  Created {formatDateTime(f.created_at)} · by{' '}
                  {f.author_id === user?.id ? 'you' : shortId(f.author_id)}
                  {f.due_at && ` · due ${formatDate(f.due_at)}`}
                  {f.completed_at && ` · completed ${formatDateTime(f.completed_at)}`}
                </p>
                {f.due_at && !f.completed_at && (
                  <Button
                    className="mt-2"
                    size="sm"
                    variant="secondary"
                    onClick={() => setTarget(f)}
                  >
                    Mark complete
                  </Button>
                )}
              </li>
            )
          })}
      </ul>
      <ConfirmDialog
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
        title="Complete this follow-up?"
        description="It will be marked completed by the backend. It cannot be reopened here."
        confirmLabel="Mark complete"
        onConfirm={() => target && done.mutate(target.id)}
      />
    </>
  )
}
