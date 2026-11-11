import { Activity, CalendarClock, Layers, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, type Column } from '@/components/common/DataTable'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { SearchInput } from '@/components/common/SearchInput'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ErrorState, LoadingState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label, Select } from '@/components/ui/input'
import { formatDateTime, humanize, pageCount } from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { toast } from 'sonner'
import { auditLogsService } from '../services/auditLogsService'
import {
  useActorNames,
  useAuditActions,
  useAuditPage,
  useAuditSample,
  useAuditTotals,
} from '../hooks/useAudit'
import { PAGE_SIZE } from '../services/auditLogsService'
import type { AuditEntry, AuditFilters } from '../types'
import { countBy, dayBound, searchEntries } from '../utils/audit'

const NONE: AuditFilters = { action: '', recordType: '', actorUserId: '' }

function Breakdown({ title, rows }: { title: string; rows: { name: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-xs text-muted">Based on the latest 100 recorded events.</p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No events.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {rows.slice(0, 5).map((r) => (
              <li key={r.name} className="flex justify-between gap-3">
                <span className="truncate">{r.name}</span>
                <span className="font-medium">{r.count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function Dashboard() {
  const { total, today } = useAuditTotals()
  const sample = useAuditSample()
  const { name } = useActorNames()
  const e = sample.data?.entries ?? []
  return (
    <section aria-label="Audit summary" className="mb-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Total recorded activities"
          icon={Activity}
          value={total.data}
          loading={total.isPending}
          error={total.isError}
          hint={
            total.data === undefined && total.isSuccess ? 'Backend returned no total' : undefined
          }
        />
        <StatCard
          label="Activities today"
          icon={CalendarClock}
          value={today.data}
          loading={today.isPending}
          error={today.isError}
          hint="Since local midnight"
        />
      </div>
      {sample.isError ? (
        <p role="alert" className="text-sm text-rose-800">
          Breakdowns unavailable: {toAppError(sample.error).message}
        </p>
      ) : sample.isPending ? (
        <LoadingState label="Loading breakdowns…" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Breakdown
            title="By administrator"
            rows={countBy(e, (r) => (r.actorUserId ? name(r.actorUserId) : humanize(r.actorType)))}
          />
          <Breakdown title="By module" rows={countBy(e, (r) => r.recordType)} />
        </div>
      )}
      {sample.isSuccess && (sample.data.partial || (total.data !== undefined && e.length < total.data)) && (
        <p role="note" className="text-xs text-muted">
          Breakdowns are incomplete: {e.length.toLocaleString()}
          {total.data !== undefined ? ` of ${total.data.toLocaleString()}` : ''} events were loaded
          (safety limit), so these counts are understated.
        </p>
      )}
    </section>
  )
}

export default function AuditLogsPage() {
  const { name, staff } = useActorNames()
  const sample = useAuditSample()
  const [draft, setDraft] = useState({ ...NONE, fromDay: '', toDay: '' })
  const [applied, setApplied] = useState<AuditFilters>(NONE)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const q = useAuditPage(applied, page)
  const actions = useAuditActions()
  const [exporting, setExporting] = useState(false)
  const exportCsv = async () => {
    setExporting(true)
    try {
      await auditLogsService.exportCsv(applied)
    } catch (e) {
      toast.error(toAppError(e).message)
    } finally {
      setExporting(false)
    }
  }

  const rangeInvalid = !!draft.fromDay && !!draft.toDay && draft.fromDay > draft.toDay
  const apply = (ev: FormEvent) => {
    ev.preventDefault()
    if (rangeInvalid) return
    setPage(1)
    setApplied({
      action: draft.action.trim(),
      recordType: draft.recordType.trim(),
      actorUserId: draft.actorUserId,
      from: dayBound(draft.fromDay, false),
      to: dayBound(draft.toDay, true),
    })
  }
  const reset = () => {
    setDraft({ ...NONE, fromDay: '', toDay: '' })
    setApplied(NONE)
    setPage(1)
    setSearch('')
  }

  const err = q.isError ? toAppError(q.error) : undefined
  const rows = searchEntries(q.data?.entries ?? [], search, name)
  const modules = [...new Set((sample.data?.entries ?? []).map((r) => r.recordType))].filter(
    (m) => m !== 'Restricted',
  )

  const columns: Column<AuditEntry>[] = [
    {
      header: 'Time',
      cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.at)}</span>,
    },
    {
      header: 'Actor',
      cell: (r) =>
        r.actorUserId ? (
          (r.actorName ?? name(r.actorUserId))
        ) : (
          <StatusBadge label={humanize(r.actorType)} />
        ),
    },
    {
      header: 'Action',
      cell: (r) =>
        r.restricted ? <StatusBadge label="Restricted" tone="warning" /> : humanize(r.action),
    },
    { header: 'Module', cell: (r) => (r.restricted ? '—' : humanize(r.recordType)) },
    {
      header: 'Record',
      cell: (r) => <code className="text-xs">{r.recordId ? r.recordId.slice(0, 8) : '—'}</code>,
    },
    {
      header: 'Details',
      cell: (r) => (
        <Link
          to={r.id}
          state={{ entry: r }}
          className="text-coral-ink underline"
          aria-label={`View event ${r.id}`}
        >
          View
        </Link>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Read-only record of administrative activity. Visible to Super Administrators only; events cannot be edited or deleted."
      />
      {err?.status === 403 ? (
        <Card>
          <ErrorState message="You do not have permission to view audit logs." />
        </Card>
      ) : (
        <>
          <Dashboard />
          <Card>
            <form onSubmit={apply} className="grid gap-3 border-b border-line p-4 md:grid-cols-3">
              <div>
                <Label htmlFor="f-actor">Administrator</Label>
                <Select
                  id="f-actor"
                  value={draft.actorUserId}
                  onChange={(e) => setDraft({ ...draft, actorUserId: e.target.value })}
                >
                  <option value="">All administrators</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="f-module">Module (record type)</Label>
                <Input
                  id="f-module"
                  list="audit-modules"
                  maxLength={50}
                  value={draft.recordType}
                  onChange={(e) => setDraft({ ...draft, recordType: e.target.value })}
                />
                <datalist id="audit-modules">
                  {modules.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label htmlFor="f-action">Action</Label>
                <Input
                  id="f-action"
                  maxLength={80}
                  list="audit-actions"
                  value={draft.action}
                  onChange={(e) => setDraft({ ...draft, action: e.target.value })}
                />
                <datalist id="audit-actions">
                  {(actions.data ?? []).map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label htmlFor="f-from">From date</Label>
                <Input
                  id="f-from"
                  type="date"
                  value={draft.fromDay}
                  onChange={(e) => setDraft({ ...draft, fromDay: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="f-to">To date</Label>
                <Input
                  id="f-to"
                  type="date"
                  value={draft.toDay}
                  onChange={(e) => setDraft({ ...draft, toDay: e.target.value })}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={rangeInvalid}>
                  Apply filters
                </Button>
                <Button type="button" variant="secondary" onClick={reset}>
                  Reset
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void exportCsv()}
                  disabled={exporting}
                >
                  {exporting ? 'Exporting…' : 'Export CSV'}
                </Button>
              </div>
              {rangeInvalid && (
                <p role="alert" className="text-xs text-rose-800 md:col-span-3">
                  The start date must be on or before the end date.
                </p>
              )}
            </form>
            <div className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div className="w-full sm:w-72">
                <SearchInput value={search} onChange={setSearch} label="Search this page" />
              </div>
              <p className="text-xs text-muted">
                <Layers className="mr-1 inline size-3" aria-hidden />
                Search covers the loaded page; filters above query the whole log.
              </p>
            </div>
            {q.isPending ? (
              <LoadingState label="Loading audit events…" />
            ) : err || !q.data ? (
              <ErrorState
                message={err?.message ?? 'Failed to load audit events.'}
                onRetry={() => void q.refetch()}
              />
            ) : (
              <>
                <DataTable
                  columns={columns}
                  rows={rows}
                  rowKey={(r) => r.id}
                  emptyTitle="No audit events match these filters"
                />
                <Pagination
                  page={page}
                  pageCount={pageCount(q.data.meta, page, PAGE_SIZE, q.data.entries.length)}
                  onChange={setPage}
                />
              </>
            )}
          </Card>
          <p className="mt-3 flex items-center gap-1 text-xs text-muted">
            <Users className="size-3" aria-hidden />
            Backend records only actor, action, record, request id and metadata: no outcome, IP or
            device is provided.
          </p>
        </>
      )}
    </>
  )
}
