import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { fetchAll } from '@/features/reports/utils/aggregate'
import { useStaffList } from '@/features/user-management/hooks/useUsers'
import { auditLogsService as svc } from '../services/auditLogsService'
import type { AuditFilters } from '../types'
import { startOfToday, toEntry } from '../utils/audit'

export const useAuditPage = (f: AuditFilters, page: number) => {
  const { can } = useAuth()
  const strategic = can('strategicEnquiries')
  return useQuery({
    queryKey: ['audit', 'list', f, page, strategic],
    queryFn: async () => {
      const { rows, meta } = await svc.list(f, page)
      return { entries: rows.map((r) => toEntry(r, strategic)), meta }
    },
    retry: false,
  })
}

/** All events (paged, up to the safety ceiling): basis for the by-administrator / by-module breakdowns. */
export const useAuditSample = () => {
  const { can } = useAuth()
  const strategic = can('strategicEnquiries')
  return useQuery({
    queryKey: ['audit', 'sample', strategic],
    queryFn: async () => {
      const f = await fetchAll((p) => svc.list({ action: '', recordType: '', actorUserId: '' }, p, 100))
      return { entries: f.rows.map((r) => toEntry(r, strategic)), partial: f.partial }
    },
    retry: false,
  })
}

export const useAuditTotals = () => {
  const day = startOfToday()
  const total = useQuery({
    queryKey: ['audit', 'total'],
    queryFn: () => svc.count({}),
    retry: false,
  })
  const today = useQuery({
    queryKey: ['audit', 'today', day],
    queryFn: () => svc.count({ from: day }),
    retry: false,
  })
  return { total, today }
}

/** Actor id -> name from the staff list (also super-administrator only). Falls back to the short id. */
export function useActorNames() {
  const staff = useStaffList()
  const byId = new Map((staff.data ?? []).map((s) => [s.id, s.full_name]))
  return {
    name: (id: string | null) => (id ? (byId.get(id) ?? `${id.slice(0, 8)}…`) : 'System'),
    staff: staff.data ?? [],
  }
}

/** One event by id, used when the detail page is opened without list state (deep link / reload). */
export const useAuditEvent = (id: string | undefined, enabled: boolean) => {
  const { can } = useAuth()
  const strategic = can('strategicEnquiries')
  return useQuery({
    queryKey: ['audit', 'event', id, strategic],
    queryFn: async () => toEntry(await svc.get(id!), strategic),
    enabled: enabled && !!id,
    retry: false,
  })
}

/** Action catalogue for the filter list (GET /admin/audit/actions). */
export const useAuditActions = () =>
  useQuery({ queryKey: ['audit', 'actions'], queryFn: svc.actions, retry: false })
