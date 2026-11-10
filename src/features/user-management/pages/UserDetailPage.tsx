import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/input'
import { ROLES, type Role } from '@/config/permissions'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { formatDateTime, humanize, shortId } from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { useStaffActivity, useStaffList, useStaffMutation } from '../hooks/useUsers'
import { roleChangeSchema } from '../schemas'
import { userManagementService as svc } from '../services/userManagementService'
import type { StaffOut } from '../types'
import {
  canActivate,
  canDeactivate,
  isPrivilegedChange,
  lockoutReason,
  roleLabel,
  statusTone,
} from '../utils/users'

type Pending = 'activate' | 'deactivate' | 'mfa' | { role: Role }

function Activity({ id }: { id: string }) {
  const q = useStaffActivity(id)
  if (q.isPending) return <LoadingState label="Loading activity…" />
  if (q.isError) {
    const e = toAppError(q.error)
    return (
      <ErrorState
        message={
          e.status === 403 ? 'You do not have permission to view the audit trail.' : e.message
        }
      />
    )
  }
  if (q.data.length === 0)
    return <EmptyState title="No audit events found for this administrator" />
  return (
    <>
      <p className="mb-2 text-xs text-muted">
        Actions by this user, plus changes to this account found in the newest 100 audit entries
        (the backend cannot filter by record, so older changes may not appear).
      </p>
      <ul className="divide-y divide-line text-sm">
        {q.data.map((ev) => (
          <li key={ev.id} className="flex flex-wrap justify-between gap-2 py-2">
            <span>
              <b>{humanize(ev.action.replace(/[.:]/g, '_'))}</b> · {humanize(ev.recordType)} ·{' '}
              {ev.recordId === id ? 'on this account' : 'by this user'}
              {ev.actorUserId && ev.actorUserId !== id ? ` (actor ${shortId(ev.actorUserId)})` : ''}
            </span>
            <time className="text-muted">{formatDateTime(ev.at)}</time>
          </li>
        ))}
      </ul>
    </>
  )
}

function Actions({ u, all }: { u: StaffOut; all: StaffOut[] }) {
  const { user: me } = useAuth()
  const [pending, setPending] = useState<Pending | null>(null)
  const [role, setRole] = useState<Role | ''>('')
  const [err, setErr] = useState<string | null>(null)
  const done = () => setPending(null)
  const act = useStaffMutation(
    (a: Pending) =>
      a === 'activate'
        ? svc.activate(u.id)
        : a === 'deactivate'
          ? svc.deactivate(u.id)
          : a === 'mfa'
            ? svc.resetMfa(u.id)
            : svc.setRole(u.id, a.role),
    'Change applied',
    () => setRole(''),
  )
  const roleBlock = lockoutReason(u, me?.id, all, 'role')
  const offBlock = lockoutReason(u, me?.id, all, 'deactivate')

  const askRole = () => {
    const r = roleChangeSchema(u.staff_role).safeParse({ role })
    if (!r.success) return setErr(r.error.issues[0]?.message ?? 'Invalid role')
    setErr(null)
    setPending({ role: r.data.role })
  }
  const copy = (): { title: string; text: string; label: string; danger: boolean } => {
    if (pending === 'activate')
      return {
        title: 'Activate administrator?',
        text: `${u.full_name} will be able to sign in again.`,
        label: 'Activate',
        danger: false,
      }
    if (pending === 'deactivate')
      return {
        title: 'Deactivate administrator?',
        text: `${u.full_name} will lose console access.`,
        label: 'Deactivate',
        danger: true,
      }
    if (pending === 'mfa')
      return {
        title: 'Reset MFA?',
        text: `${u.full_name}'s authenticator is cleared and they must re-enrol on next sign-in.`,
        label: 'Reset MFA',
        danger: true,
      }
    const to = pending && typeof pending === 'object' ? pending.role : 'content_administrator'
    return {
      title: 'Change role?',
      text: `${u.full_name}: ${roleLabel(u.staff_role)} → ${ROLES[to]}.${isPrivilegedChange(u.staff_role, to) ? ' This grants or removes full Super Administrator access.' : ''}`,
      label: 'Change role',
      danger: isPrivilegedChange(u.staff_role, to),
    }
  }
  const c = copy()
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <Select
          aria-label="New role"
          className="w-auto min-w-56"
          value={role}
          disabled={!!roleBlock}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          <option value="">Select new role</option>
          {Object.entries(ROLES).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          disabled={!role || !!roleBlock || act.isPending}
          onClick={askRole}
        >
          Change role
        </Button>
      </div>
      {err && (
        <p role="alert" className="text-xs text-rose-800">
          {err}
        </p>
      )}
      {roleBlock && <p className="text-xs text-muted">{roleBlock}</p>}
      <div className="flex flex-wrap gap-2">
        {canActivate(u) && (
          <Button onClick={() => setPending('activate')} disabled={act.isPending}>
            Activate
          </Button>
        )}
        {canDeactivate(u) && (
          <Button
            variant="danger"
            onClick={() => setPending('deactivate')}
            disabled={!!offBlock || act.isPending}
          >
            Deactivate
          </Button>
        )}
        <Button variant="secondary" onClick={() => setPending('mfa')} disabled={act.isPending}>
          Reset MFA
        </Button>
      </div>
      {offBlock && canDeactivate(u) && <p className="text-xs text-muted">{offBlock}</p>}
      <p className="text-xs text-muted">
        These controls are a convenience. The backend authorises and validates every change and its
        error is shown if it refuses (for example 409).
      </p>
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && done()}
        title={c.title}
        description={c.text}
        confirmLabel={c.label}
        destructive={c.danger}
        onConfirm={() => pending && act.mutate(pending)}
      />
    </div>
  )
}

export default function UserDetailPage() {
  const { id = '' } = useParams()
  const q = useStaffList()
  if (q.isPending) return <LoadingState label="Loading administrator…" />
  if (q.isError) {
    const e = toAppError(q.error)
    return (
      <ErrorState
        message={
          e.status === 403 ? 'Only Super Administrators can view staff accounts.' : e.message
        }
        onRetry={() => void q.refetch()}
      />
    )
  }
  const u = q.data.find((x) => x.id === id)
  if (!u)
    return (
      <EmptyState
        title="Administrator not found"
        description="No staff account with this ID exists in the backend list."
        action={
          <Link to="/admin/users" className="text-coral-ink underline">
            Back to Admin Users
          </Link>
        }
      />
    )
  const rows: [string, React.ReactNode][] = [
    ['Administrator ID', <span className="font-mono text-xs">{u.id}</span>],
    ['Email', u.email],
    ['Role', roleLabel(u.staff_role)],
    ['Status', <StatusBadge label={humanize(u.status)} tone={statusTone(u.status)} />],
    ['MFA', u.mfa_enabled ? 'Enrolled' : 'Not enrolled'],
    ['Last login', formatDateTime(u.last_login_at)],
    ['Created / updated / contact', 'Not provided by the backend'],
  ]
  return (
    <>
      <PageHeader
        title={u.full_name}
        description="Administrator profile"
        actions={
          <Link to="/admin/users" className="text-sm text-coral-ink underline">
            All administrators
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Profile</h2>
          <dl className="divide-y divide-line text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Role &amp; account status</h2>
          <Actions u={u} all={q.data} />
        </Card>
        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Activity history</h2>
          <Activity id={u.id} />
        </Card>
      </div>
    </>
  )
}
