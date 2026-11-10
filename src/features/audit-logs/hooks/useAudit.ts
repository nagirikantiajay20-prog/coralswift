import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/useAuth'
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

/** Latest 100 events: basis for the by-administrator / by-module breakdowns (labelled as a sample). */
export const useAuditSample = () => {
  const { can } = useAuth()
  const strategic = can('strategicEnquiries')
  return useQuery({
    queryKey: ['audit', 'sample', strategic],
    queryFn: async () =>
      (await svc.list({ action: '', recordType: '', actorUserId: '' }, 1, 100)).rows.map((r) =>
        toEntry(r, strategic),
      ),
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
