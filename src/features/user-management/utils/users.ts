import type { StatusTone } from '@/components/common/StatusBadge'
import { ROLES, type Role } from '@/config/permissions'
import { humanize } from '@/features/partner-applications/utils/format'
import type { StaffOut, UserFilters } from '../types'

export const roleLabel = (r: string | null | undefined) =>
  r && r in ROLES ? ROLES[r as Role] : r ? humanize(r) : 'No role'

/** Display tone only. The backend does not enumerate statuses, so unknown values stay neutral. */
export const statusTone = (s: string): StatusTone =>
  s === 'active'
    ? 'success'
    : /invit|pending/.test(s)
      ? 'info'
      : /suspend|lock|disabled|inactive|deactivat/.test(s)
        ? 'warning'
        : 'neutral'

/** Only `active` is known to be live; every other value may be activated. The backend still validates (409). */
export const canDeactivate = (u: StaffOut) => u.status === 'active'
export const canActivate = (u: StaffOut) => u.status !== 'active'

const isLastActiveSuperAdmin = (u: StaffOut, all: StaffOut[]) =>
  u.staff_role === 'super_administrator' &&
  u.status === 'active' &&
  all.filter((x) => x.staff_role === 'super_administrator' && x.status === 'active').length <= 1

/**
 * UX-only guard (the backend remains authoritative): you cannot deactivate or re-role yourself,
 * nor remove the last active Super Administrator. Returns the reason, or null when allowed.
 */
export function lockoutReason(
  target: StaffOut,
  meId: string | undefined,
  all: StaffOut[],
  action: 'deactivate' | 'role',
): string | null {
  if (target.id === meId)
    return action === 'role'
      ? 'You cannot change your own role.'
      : 'You cannot deactivate your own account.'
  if (isLastActiveSuperAdmin(target, all))
    return 'This is the only active Super Administrator; the console must keep one.'
  return null
}

/** Role changes touching Super Administrator grant or remove full access: always extra-confirmed. */
export const isPrivilegedChange = (from: Role | null, to: Role) =>
  from === 'super_administrator' || to === 'super_administrator'

export function filterUsers(users: StaffOut[], f: UserFilters): StaffOut[] {
  const q = f.search.trim().toLowerCase()
  const key = (u: StaffOut): string =>
    f.sort === 'name'
      ? u.full_name.toLowerCase()
      : f.sort === 'email'
        ? u.email.toLowerCase()
        : f.sort === 'role'
          ? roleLabel(u.staff_role)
          : f.sort === 'status'
            ? u.status
            : (u.last_login_at ?? '')
  return users
    .filter(
      (u) =>
        (!q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
        (f.role === 'all' || u.staff_role === f.role) &&
        (f.status === 'all' || u.status === f.status),
    )
    .sort((a, b) =>
      f.sort === 'last_login' ? key(b).localeCompare(key(a)) : key(a).localeCompare(key(b)),
    )
}

/** Totals come from the complete (unpaginated) backend list, never from a page slice. */
export function metrics(users: StaffOut[]) {
  const byStatus: Record<string, number> = {}
  const byRole: Record<string, number> = {}
  for (const u of users) {
    byStatus[u.status] = (byStatus[u.status] ?? 0) + 1
    const r = u.staff_role ?? 'none'
    byRole[r] = (byRole[r] ?? 0) + 1
  }
  return { total: users.length, byStatus, byRole }
}
