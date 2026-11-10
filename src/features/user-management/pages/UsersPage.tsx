import { zodResolver } from '@hookform/resolvers/zod'
import { ShieldCheck, UserCheck, UserPlus, Users, UserX } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { DataTable, type Column } from '@/components/common/DataTable'
import { FilterDropdown } from '@/components/common/FilterDropdown'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { SearchInput } from '@/components/common/SearchInput'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ErrorState, LoadingState } from '@/components/common/states'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input, Select } from '@/components/ui/input'
import { ROLES, type Role } from '@/config/permissions'
import { formatDateTime, humanize } from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { useStaffList, useStaffMutation } from '../hooks/useUsers'
import { staffInviteSchema, type StaffInviteForm } from '../schemas'
import { userManagementService } from '../services/userManagementService'
import type { StaffOut, UserSort } from '../types'
import { filterUsers, metrics, roleLabel, statusTone } from '../utils/users'

const PAGE_SIZE = 20
const ROLE_OPTIONS = Object.entries(ROLES) as [Role, string][]

function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const f = useForm<StaffInviteForm>({ resolver: zodResolver(staffInviteSchema) })
  const m = useStaffMutation(
    (v: StaffInviteForm) => userManagementService.invite(v),
    'Invitation accepted by the backend',
    () => {
      f.reset()
      onOpenChange(false)
    },
  )
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Invite administrator"
        description="The invitee receives an email, sets their own password, then enrols in MFA. No password is created or shown here."
        footer={
          <Button type="submit" form="invite-form" disabled={m.isPending}>
            {m.isPending ? 'Sending…' : 'Send invitation'}
          </Button>
        }
      >
        <form
          id="invite-form"
          className="space-y-4"
          noValidate
          onSubmit={f.handleSubmit((v) => m.mutate(v))}
        >
          <FormField label="Full name" error={f.formState.errors.full_name?.message}>
            <Input autoComplete="off" {...f.register('full_name')} />
          </FormField>
          <FormField label="Email" error={f.formState.errors.email?.message}>
            <Input type="email" autoComplete="off" {...f.register('email')} />
          </FormField>
          <FormField
            label="Role"
            error={f.formState.errors.role?.message}
            hint="Grants the permissions the backend attaches to this role. Choose the least privilege needed."
          >
            <Select defaultValue="" {...f.register('role')}>
              <option value="" disabled>
                Select a role
              </option>
              {ROLE_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </FormField>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function UsersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<Role | 'all'>('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState<UserSort>('name')
  const [inviting, setInviting] = useState(false)
  const q = useStaffList()
  const all = q.data ?? []
  const mt = metrics(all)
  const rows = filterUsers(all, { search, role, status, sort })
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const reset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      setPage(1)
    }

  const columns: Column<StaffOut>[] = [
    {
      header: 'Name',
      cell: (u) => (
        <Link to={`/admin/users/${u.id}`} className="font-medium text-coral-ink hover:underline">
          {u.full_name}
        </Link>
      ),
    },
    { header: 'Email', cell: (u) => u.email },
    { header: 'Role', cell: (u) => roleLabel(u.staff_role) },
    {
      header: 'Status',
      cell: (u) => <StatusBadge label={humanize(u.status)} tone={statusTone(u.status)} />,
    },
    { header: 'MFA', cell: (u) => (u.mfa_enabled ? 'Enrolled' : 'Not enrolled') },
    { header: 'Last login', cell: (u) => formatDateTime(u.last_login_at) },
  ]

  return (
    <>
      <PageHeader
        title="Admin Users"
        description="Staff accounts and their roles. Super Administrators only; the backend enforces access."
        actions={
          <Button onClick={() => setInviting(true)}>
            <UserPlus className="mr-2 size-4" aria-hidden />
            Invite administrator
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total administrators"
          value={mt.total}
          icon={Users}
          loading={q.isPending}
          error={q.isError}
        />
        <StatCard
          label="Active"
          value={mt.byStatus.active ?? 0}
          icon={UserCheck}
          loading={q.isPending}
          error={q.isError}
        />
        <StatCard
          label="Not active"
          value={mt.total - (mt.byStatus.active ?? 0)}
          icon={UserX}
          hint="Any status other than active"
          loading={q.isPending}
          error={q.isError}
        />
        <StatCard
          label="Super Administrators"
          value={mt.byRole.super_administrator ?? 0}
          icon={ShieldCheck}
          loading={q.isPending}
          error={q.isError}
        />
      </div>
      {!q.isPending && !q.isError && (
        <p className="mb-4 text-xs text-muted">
          By role: {ROLE_OPTIONS.map(([v, l]) => `${l} ${mt.byRole[v] ?? 0}`).join(' · ')}. By
          status:{' '}
          {Object.entries(mt.byStatus)
            .map(([s, n]) => `${humanize(s)} ${n}`)
            .join(' · ') || '—'}
          . Suspended counts, recently-created accounts and date filters are unavailable: the
          backend returns no suspended state or creation date.
        </p>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-56 flex-1">
            <SearchInput label="Search name or email" value={search} onChange={reset(setSearch)} />
          </div>
          <FilterDropdown
            label="Role"
            value={role}
            onChange={reset(setRole)}
            options={[
              { value: 'all', label: 'All roles' },
              ...ROLE_OPTIONS.map(([value, label]) => ({ value, label })),
            ]}
          />
          <FilterDropdown
            label="Status"
            value={status}
            onChange={reset(setStatus)}
            options={[
              { value: 'all', label: 'All statuses' },
              ...Object.keys(mt.byStatus).map((s) => ({ value: s, label: humanize(s) })),
            ]}
          />
          <FilterDropdown
            label="Sort by"
            value={sort}
            onChange={setSort}
            options={[
              { value: 'name', label: 'Sort: Name' },
              { value: 'email', label: 'Sort: Email' },
              { value: 'role', label: 'Sort: Role' },
              { value: 'status', label: 'Sort: Status' },
              { value: 'last_login', label: 'Sort: Last login' },
            ]}
          />
        </div>
        <p className="px-4 pb-2 text-xs text-muted">
          The backend returns the full staff list without search or pagination, so search, status,
          sorting and paging run in the browser over that complete list.
        </p>
        {q.isPending ? (
          <LoadingState label="Loading administrators…" />
        ) : q.isError ? (
          <ErrorState
            message={
              toAppError(q.error).status === 403
                ? 'Only Super Administrators can view staff accounts.'
                : toAppError(q.error).message
            }
            onRetry={() => void q.refetch()}
          />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={shown}
              rowKey={(u) => u.id}
              emptyTitle={
                all.length ? 'No administrators match these filters' : 'No administrators yet'
              }
            />
            <Pagination page={page} pageCount={pages} onChange={setPage} />
          </>
        )}
      </Card>
      <InviteDialog open={inviting} onOpenChange={setInviting} />
    </>
  )
}
