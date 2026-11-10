import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DataTable } from '@/components/common/DataTable'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ErrorState, LoadingState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toAppError } from '@/services/api/errors'
import {
  canExecute,
  governanceService as svc,
  PRIVACY_STATUSES,
  type PrivacyRequest,
  type PrivacyStatus,
} from '../service'

const fmt = (v: string | null) => (v ? new Date(v).toLocaleString() : '—')
const onError = (e: unknown) => toast.error(toAppError(e).message)

function Privacy() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [exec, setExec] = useState<PrivacyRequest | null>(null)
  const q = useQuery({
    queryKey: ['privacy', status],
    queryFn: () => svc.privacy(status),
    retry: false,
  })
  const refresh = () => qc.invalidateQueries({ queryKey: ['privacy'] })
  const set = useMutation({
    mutationFn: (v: { id: string; status: PrivacyStatus; note?: string }) =>
      svc.setPrivacy(v.id, v.status, v.note),
    onSuccess: () => {
      toast.success('Request updated')
      void refresh()
    },
    onError,
  })
  const run = useMutation({
    mutationFn: (id: string) => svc.executeDeletion(id),
    onSuccess: (c) => {
      toast.success(`Backend executed the deletion: ${JSON.stringify(c)}`)
      void refresh()
    },
    onError,
  })
  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-base font-semibold">
          Data access, correction and deletion requests
        </h2>
        <label className="text-sm">
          <span className="sr-only">Filter by status</span>
          <select
            className="rounded-md border border-line bg-white px-2 py-1.5 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {PRIVACY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </label>
      </div>
      {q.isLoading ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState message={toAppError(q.error).message} onRetry={() => q.refetch()} />
      ) : (
        <>
          <p className="mb-2 text-xs text-muted">
            Showing {q.data!.rows.length}
            {q.data!.total != null ? ` of ${q.data!.total}` : ''} (first page, up to 100).
          </p>
          <DataTable
            rows={q.data!.rows}
            rowKey={(r) => r.id}
            emptyTitle="No privacy requests"
            columns={[
              { header: 'Reference', cell: (r) => r.reference },
              { header: 'Email', cell: (r) => r.email },
              { header: 'Type', cell: (r) => r.kind },
              { header: 'Received', cell: (r) => fmt(r.created_at) },
              {
                header: 'Status',
                cell: (r) => (
                  <StatusBadge
                    label={r.status.replace('_', ' ')}
                    tone={
                      r.status === 'completed'
                        ? 'success'
                        : r.status === 'rejected'
                          ? 'danger'
                          : 'warning'
                    }
                  />
                ),
              },
              { header: 'Note', cell: (r) => r.resolution_note ?? r.details ?? '—' },
              {
                header: 'Actions',
                cell: (r) => (
                  <div className="flex flex-wrap gap-1">
                    {r.status === 'received' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={set.isPending}
                        onClick={() => set.mutate({ id: r.id, status: 'in_progress' })}
                      >
                        Start
                      </Button>
                    )}
                    {r.status === 'in_progress' && r.kind !== 'deletion' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={set.isPending}
                        onClick={() =>
                          set.mutate({ id: r.id, status: 'completed', note: 'Completed by staff' })
                        }
                      >
                        Mark completed
                      </Button>
                    )}
                    {canExecute(r) && (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={run.isPending}
                        onClick={() => setExec(r)}
                      >
                        Execute deletion
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </>
      )}
      <ConfirmDialog
        open={!!exec}
        onOpenChange={(o) => !o && setExec(null)}
        destructive
        title="Execute deletion?"
        description={`The backend will anonymise contact data for ${exec?.email ?? ''}. This cannot be undone and is audited. Legal retention duties are not checked here.`}
        confirmLabel="Execute deletion"
        onConfirm={() => exec && run.mutate(exec.id)}
      />
    </Card>
  )
}

function Changes() {
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const q = useQuery({ queryKey: ['changes'], queryFn: () => svc.changes('pending'), retry: false })
  const m = useMutation({
    mutationFn: (v: { id: string; approve: boolean }) => svc.decide(v.id, v.approve, note.trim()),
    onSuccess: () => {
      toast.success('Decision recorded')
      setNote('')
      void qc.invalidateQueries({ queryKey: ['changes'] })
    },
    onError,
  })
  return (
    <Card className="p-4">
      <h2 className="mb-3 font-heading text-base font-semibold">
        Pending partner profile change requests
      </h2>
      <label className="mb-3 block text-sm">
        <span className="text-muted">Decision note (optional, max 4000 characters)</span>
        <Input value={note} maxLength={4000} onChange={(e) => setNote(e.target.value)} />
      </label>
      {q.isLoading ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState message={toAppError(q.error).message} onRetry={() => q.refetch()} />
      ) : (
        <DataTable
          rows={q.data!}
          rowKey={(r) => r.id}
          emptyTitle="No pending change requests"
          columns={[
            { header: 'Organisation', cell: (r) => r.organization_id.slice(0, 8) },
            { header: 'Requested', cell: (r) => fmt(r.created_at) },
            { header: 'Reason', cell: (r) => r.reason },
            { header: 'Fields', cell: (r) => Object.keys(r.changes).join(', ') || '—' },
            {
              header: 'Decision',
              cell: (r) => (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    disabled={m.isPending}
                    onClick={() => m.mutate({ id: r.id, approve: true })}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={m.isPending}
                    onClick={() => m.mutate({ id: r.id, approve: false })}
                  >
                    Reject
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}
    </Card>
  )
}

function Readiness() {
  const q = useQuery({ queryKey: ['readiness'], queryFn: svc.readiness, retry: false })
  return (
    <Card className="p-4">
      <h2 className="mb-1 font-heading text-base font-semibold">
        Launch readiness (PRD s.28 gates)
      </h2>
      <p className="mb-3 text-xs text-muted">
        Read-only report from the backend, shown as returned.
      </p>
      {q.isLoading ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState message={toAppError(q.error).message} onRetry={() => q.refetch()} />
      ) : (
        <pre className="max-h-96 overflow-auto rounded-md bg-surface p-3 text-xs">
          {JSON.stringify(q.data, null, 2)}
        </pre>
      )}
    </Card>
  )
}

export default function GovernancePage() {
  return (
    <>
      <PageHeader
        title="Privacy & Governance"
        description="Super administrator only. Every action is authorised and audited by the backend."
      />
      <div className="space-y-6">
        <Privacy />
        <Changes />
        <Readiness />
      </div>
    </>
  )
}
