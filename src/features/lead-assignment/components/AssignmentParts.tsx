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
import type { AssignCategory, AssignRecord, CategoryCounts } from '../types'
import { assigneeLabel, CATEGORIES, tallyWorkload } from '../utils/assignment'

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

/** Workload tallied from the newest records only; the coverage line says how much was counted. */
export function WorkloadSection({
  cats,
  samples,
  me,
  names,
  size,
}: {
  cats: AssignCategory[]
  samples: UseQueryResult<{ records: AssignRecord[]; meta: Record<string, unknown> | null }>[]
  me?: string
  names?: Map<string, string>
  size: number
}) {
  const ok = samples.filter((s) => s.data)
  const rows = tallyWorkload(ok.flatMap((s) => s.data?.records ?? []))
  const partial = ok.some((s) => {
    const t = s.data?.meta?.total
    return typeof t !== 'number' || t > s.data!.records.length
  })
  const pending = samples.some((s) => s.isPending)
  return (
    <Card className="mt-6">
      <div className="border-b border-line p-4">
        <h2 className="text-lg font-semibold">Workload by administrator</h2>
        <p className="text-xs text-muted">
          {partial
            ? `Counted from the newest ${size} records per category, not every record. Counts can be lower than the true workload.`
            : 'Counted from all records in each category.'}{' '}
          The backend has no workload endpoint, and no capacity limits are defined. Names need super
          administrator access.
        </p>
        {samples.some((s) => s.isError) && (
          <p role="alert" className="text-xs text-rose">
            Not counted:{' '}
            {cats
              .filter((_, i) => samples[i]?.isError)
              .map((c) => CATEGORIES.find((x) => x.key === c)?.label)
              .join(', ')}
            .
          </p>
        )}
      </div>
      {pending && !rows.length ? (
        <p role="status" className="p-4 text-sm text-muted">
          Loading workload…
        </p>
      ) : (
        <DataTable
          rows={rows}
          rowKey={(w) => w.assigneeId}
          emptyTitle="No assigned records in the counted sample"
          columns={[
            { header: 'Administrator', cell: (w) => assigneeLabel(w.assigneeId, me, names) },
            { header: 'Assigned', cell: (w) => w.assigned },
            { header: 'Pending', cell: (w) => w.pending },
            { header: 'Overdue follow-ups', cell: (w) => w.overdue },
            {
              header: 'By category',
              cell: (w) =>
                cats
                  .filter((c) => w.byCategory[c])
                  .map((c) => `${CATEGORIES.find((x) => x.key === c)?.label}: ${w.byCategory[c]}`)
                  .join(' · '),
            },
          ]}
        />
      )}
    </Card>
  )
}
