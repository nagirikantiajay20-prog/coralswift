import { CalendarClock, ClipboardList, ShieldOff, UserCheck, UserX, Users } from 'lucide-react'
import { useState } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { DataTable } from '@/components/common/DataTable'
import { StatCard } from '@/components/common/StatCard'
import { EmptyState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AssignDialog as EnquiryAssignDialog } from '@/features/business-enquiries/components/EnquiryActions'
import { AssignDialog as ApplicationAssignDialog } from '@/features/partner-applications/components/ReviewActions'
import { toAppError } from '@/services/api/errors'
import type { WorkloadData } from '../services/leadAssignmentService'
import type { AssignCategory, AssignRecord, CategoryCounts } from '../types'
import { CATEGORIES } from '../utils/assignment'

export const isForbidden = (e: unknown) => toAppError(e).status === 403

export const AccessDenied = ({ what }: { what: string }) => (
  <EmptyState
    icon={ShieldOff}
    title="Access denied"
    description={`The backend did not authorize your account to view ${what}.`}
  />
)

/** Reuses the Phase 5 (applications) and Phase 8/9 (enquiries) assignment dialogs and mutations. */
export function AssignAction({ record, allowed }: { record: AssignRecord; allowed: boolean }) {
  const [open, setOpen] = useState(false)
  if (!allowed) return <span className="text-xs text-muted">No assign access</span>
  const close = () => setOpen(false)
  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        aria-label={`${record.assigneeId ? 'Reassign' : 'Assign'} ${record.reference}`}
        onClick={() => setOpen(true)}
      >
        {record.assigneeId ? 'Reassign' : 'Assign'}
      </Button>
      {open &&
        (record.category === 'applications' ? (
          <ApplicationAssignDialog id={record.id} current={record.assigneeId} onClose={close} />
        ) : (
          <EnquiryAssignDialog
            enquiry={{
              id: record.id,
              reference_number: record.reference,
              assigned_user_id: record.assigneeId,
            }}
            onClose={close}
          />
        ))}
    </>
  )
}

type CountQ = UseQueryResult<CategoryCounts>
const sum = (qs: CountQ[], k: keyof CategoryCounts) => {
  const vals = qs.map((q) => q.data?.[k]).filter((v): v is number => v !== undefined)
  return vals.length ? vals.reduce((a, b) => a + b, 0) : undefined
}

/** Totals are the backend's reported counts (meta.total); a missing figure shows "—", never a guess. */
export function CountsSection({ cats, queries }: { cats: AssignCategory[]; queries: CountQ[] }) {
  const loading = queries.some((q) => q.isPending)
  const failed = queries.length > 0 && queries.every((q) => q.isError)
  const excluded = cats
    .filter((_, i) => !queries[i]?.isPending && queries[i]?.data?.total === undefined)
    .map((c) => CATEGORIES.find((x) => x.key === c)?.label)
  const total = sum(queries, 'total')
  const un = sum(queries, 'unassigned')
  return (
    <section aria-label="Assignment metrics" className="mb-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total records"
          value={total}
          icon={ClipboardList}
          loading={loading}
          error={failed}
          hint="All statuses"
        />
        <StatCard
          label="Assigned"
          value={total !== undefined && un !== undefined ? total - un : undefined}
          icon={UserCheck}
          loading={loading}
          error={failed}
          hint="Total minus unassigned"
        />
        <StatCard label="Unassigned" value={un} icon={UserX} loading={loading} error={failed} />
        <StatCard
          label="Assigned to me"
          value={sum(
            queries.filter((_, i) => cats[i] !== 'applications'),
            'mine',
          )}
          icon={Users}
          loading={loading}
          error={failed}
          hint="Enquiries only; the applications API has no owner filter"
        />
        <StatCard
          label="Overdue follow-ups"
          value={sum(
            queries.filter((_, i) => cats[i] !== 'applications'),
            'overdue',
          )}
          icon={CalendarClock}
          loading={loading}
          error={failed}
          hint="Enquiries only; applications have no follow-ups"
        />
      </div>
      {excluded.length > 0 && (
        <p role="note" className="text-xs text-muted">
          Summary totals exclude: {excluded.join(', ')} (failed, access denied or no total
          returned).
        </p>
      )}
      <Card>
        <DataTable
          rows={cats.map((c, i) => ({ c, q: queries[i] }))}
          rowKey={(r) => r.c}
          columns={[
            { header: 'Category', cell: (r) => CATEGORIES.find((x) => x.key === r.c)?.label },
            ...(['total', 'unassigned', 'mine', 'overdue'] as const).map((k) => ({
              header: {
                total: 'Total',
                unassigned: 'Unassigned',
                mine: 'Assigned to me',
                overdue: 'Overdue',
              }[k],
              cell: (r: { q: CountQ }) =>
                r.q?.isPending
                  ? '…'
                  : r.q?.isError
                    ? isForbidden(r.q.error)
                      ? 'Access denied'
                      : 'Error'
                    : (r.q?.data?.[k] ?? 'Unavailable'),
            })),
          ]}
        />
      </Card>
    </section>
  )
}

/** Server-side open-enquiry workload per assignee (GET /admin/workload). Applications are not included. */
export function WorkloadSection({ q }: { q: UseQueryResult<WorkloadData> }) {
  const d = q.data
  return (
    <Card className="mt-6">
      <div className="border-b border-line p-4">
        <h2 className="text-lg font-semibold">Workload by administrator</h2>
        <p className="text-xs text-muted">
          Open enquiries per assignee, counted by the server. No capacity limits are defined, and
          applications are not included.
        </p>
      </div>
      {q.isPending ? (
        <p role="status" className="p-4 text-sm text-muted">
          Loading workload…
        </p>
      ) : q.isError ? (
        isForbidden(q.error) ? (
          <AccessDenied what="workload" />
        ) : (
          <p role="alert" className="p-4 text-sm text-rose">
            {toAppError(q.error).message}
          </p>
        )
      ) : (
        <DataTable
          rows={d?.rows ?? []}
          rowKey={(w) => w.assignee_id ?? 'unassigned'}
          emptyTitle="No open enquiries"
          columns={[
            {
              header: 'Administrator',
              cell: (w) => w.assignee_name ?? (w.assignee_id ? 'Unknown user' : 'Unassigned'),
            },
            { header: 'Open enquiries', cell: (w) => w.open_enquiries },
            { header: 'Overdue follow-ups', cell: (w) => w.overdue_follow_ups },
            { header: 'SLA breached', cell: (w) => w.sla_breached },
          ]}
        />
      )}
      {d && (
        <p className="border-t border-line px-4 py-2 text-xs text-muted">
          Total: {d.totals.open_enquiries} open · {d.totals.overdue_follow_ups} overdue follow-ups ·{' '}
          {d.totals.sla_breached} SLA breached
        </p>
      )}
    </Card>
  )
}
