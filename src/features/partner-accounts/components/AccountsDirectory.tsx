import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { Pagination } from '@/components/common/Pagination'
import { SearchInput } from '@/components/common/SearchInput'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ErrorState, LoadingState } from '@/components/common/states'
import { Card } from '@/components/ui/card'
import { formatDateTime, humanize, pageCount } from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { useAccountAction, useAccountList } from '../hooks/useAccounts'
import { actionsFor, type AccountActionDef } from '../utils/accounts'
import type { AccountRow } from '../types'

const SIZE = 20
const TONE = { active: 'success', invited: 'warning', deactivated: 'neutral' } as const

const DELIVERY_TONE: Record<string, 'success' | 'warning' | 'neutral' | 'danger'> = {
  sent: 'success',
  logged: 'neutral',
  pending: 'warning',
  failed: 'danger',
}

const baseColumns: Column<AccountRow>[] = [
  { header: 'Name', cell: (r) => <span className="font-medium">{r.full_name}</span> },
  { header: 'Email', cell: (r) => r.email },
  { header: 'Organization', cell: (r) => r.organization?.legal_name ?? '—' },
  {
    header: 'Account',
    cell: (r) => <StatusBadge label={humanize(r.status)} tone={TONE[r.status] ?? 'neutral'} />,
  },
  { header: 'Invitation', cell: (r) => humanize(r.invitation_state) },
  {
    header: 'Invitation email',
    cell: (r) =>
      r.invitation_delivery_status ? (
        <span title="Email delivery only; the account is active once the partner sets a password.">
          <StatusBadge
            label={humanize(r.invitation_delivery_status)}
            tone={DELIVERY_TONE[r.invitation_delivery_status] ?? 'neutral'}
          />
          {r.invitation_delivery_at && (
            <span className="ml-2 text-xs text-muted">
              {formatDateTime(r.invitation_delivery_at)}
            </span>
          )}
        </span>
      ) : (
        '—'
      ),
  },
  { header: 'MFA', cell: (r) => (r.mfa_enabled ? 'On' : 'Off') },
  {
    header: 'Last login',
    cell: (r) => (r.last_login_at ? formatDateTime(r.last_login_at) : 'Never'),
  },
]

/** Partner account directory with state-appropriate actions, each behind a confirmation; the backend enforces permission. */
export function AccountsDirectory() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const q = useAccountList({
    q: search.trim() || undefined,
    status: status === 'all' ? undefined : status,
    page,
    page_size: SIZE,
  })
  const rows = q.data?.rows ?? []
  const act = useAccountAction()
  const [pending, setPending] = useState<{ row: AccountRow; def: AccountActionDef } | null>(null)
  const columns: Column<AccountRow>[] = [
    ...baseColumns,
    {
      header: 'Actions',
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {actionsFor(r).map((def) => (
            <Button
              key={def.action}
              variant="secondary"
              size="sm"
              disabled={act.isPending}
              aria-label={`${def.label}: ${r.email}`}
              onClick={() => setPending({ row: r, def })}
            >
              {def.label}
            </Button>
          ))}
        </div>
      ),
    },
  ]
  const confirm = () => {
    if (!pending) return
    const { row, def } = pending
    act.mutate(
      { id: row.id, action: def.action },
      {
        onSuccess: () => toast.success(`${def.label} done for ${row.email}.`),
        onError: (e) => {
          const err = toAppError(e)
          toast.error(
            err.status === 403
              ? 'You do not have permission for this action.'
              : err.status === 429
                ? 'Too many attempts. Try again later.'
                : err.message,
          )
        },
      },
    )
  }
  return (
    <Card className="mb-6">
      <h2 className="px-4 pt-4 font-semibold">Partner accounts</h2>
      <div className="flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-56 flex-1">
          <SearchInput
            label="Search partner accounts"
            value={search}
            onChange={(v) => {
              setSearch(v)
              setPage(1)
            }}
          />
        </div>
        <FilterDropdown
          label="Account status"
          value={status}
          onChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'invited', label: 'Invited' },
            { value: 'active', label: 'Active' },
            { value: 'deactivated', label: 'Deactivated' },
          ]}
        />
      </div>
      {q.isPending ? (
        <LoadingState label="Loading partner accounts…" />
      ) : q.isError ? (
        <ErrorState
          message={
            toAppError(q.error).status === 403
              ? 'You do not have permission to list partner accounts.'
              : toAppError(q.error).message
          }
          onRetry={() => void q.refetch()}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            emptyTitle={
              search || status !== 'all'
                ? 'No accounts match these filters'
                : 'No partner accounts yet'
            }
          />
          <Pagination
            page={page}
            pageCount={pageCount(q.data.meta, page, SIZE, rows.length)}
            onChange={setPage}
          />
        </>
      )}
      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending?.def.title ?? ''}
        description={
          pending
            ? `${pending.row.full_name} (${pending.row.email}). ${pending.def.description}`
            : ''
        }
        confirmLabel={pending?.def.label}
        destructive={pending?.def.destructive}
        onConfirm={confirm}
      />
    </Card>
  )
}
