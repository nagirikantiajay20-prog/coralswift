import { accountEndpoints, userEndpoints } from '@/config/endpoints'
import type { Role } from '@/config/permissions'
import type { AuditRow } from '@/features/partner-accounts/types'
import { toEvents } from '@/features/partner-accounts/utils/accounts'
import { api } from '@/services/api/client'
import type { ApiList, InviteBody, StaffOut } from '../types'

type One = { data: StaffOut | null }
const audit = async (params: Record<string, unknown>) =>
  toEvents((await api.get<ApiList<AuditRow>>(accountEndpoints.audit, { params })).data.data ?? [])

export const userManagementService = {
  list: async (role?: Role) =>
    (await api.get<ApiList<StaffOut>>(userEndpoints.list, { params: { role } })).data.data ?? [],
  invite: async (b: InviteBody) => (await api.post<One>(userEndpoints.list, b)).data.data,
  setRole: async (id: string, role: Role) =>
    (await api.post<One>(userEndpoints.role(id), { role })).data.data,
  activate: async (id: string) => (await api.post<One>(userEndpoints.activate(id))).data.data,
  deactivate: async (id: string) => (await api.post<One>(userEndpoints.deactivate(id))).data.data,
  resetMfa: async (id: string) => void (await api.post(userEndpoints.mfaReset(id))),
  /**
   * No per-record audit filter exists: "performed by" is server-filtered (actor_user_id); "done to"
   * is the newest 100 audit rows filtered client-side by record_id, so older events may be missing.
   */
  activity: async (id: string) => {
    const [by, all] = await Promise.all([
      audit({ actor_user_id: id, page: 1, page_size: 100 }),
      audit({ page: 1, page_size: 100 }),
    ])
    const seen = new Set<string>()
    return [...by, ...all.filter((e) => e.recordId === id)]
      .filter((e) => !seen.has(e.id) && !!seen.add(e.id))
      .sort((a, b) => b.at.localeCompare(a.at))
  },
}
