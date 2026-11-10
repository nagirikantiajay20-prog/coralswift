import { accountEndpoints, type AccountAction } from '@/config/endpoints'
import { api } from '@/services/api/client'
import { toEvents } from '../utils/accounts'
import type { AccountRow, ApiList, AuditRow } from '../types'

export const partnerAccountsService = {
  /** Resend / revoke invitation, suspend, reactivate. Never takes or returns a password or token. */
  act: async (id: string, action: AccountAction) => {
    await api.post(accountEndpoints.accountAction(id, action))
  },
  /** Partner accounts only (user_type=partner); the backend enforces who may call it. */
  list: async (params: { q?: string; status?: string; page: number; page_size: number }) => {
    const { data } = await api.get<ApiList<AccountRow>>(accountEndpoints.accounts, {
      params: { ...params, user_type: 'partner', sort: '-created_at' },
    })
    return { rows: data.data ?? [], meta: data.meta ?? null }
  },
  /** Organization-scoped audit trail (super administrator only; the backend enforces it). */
  events: async (organizationId: string) => {
    const { data } = await api.get<ApiList<AuditRow>>(accountEndpoints.audit, {
      params: { organization_id: organizationId, page: 1, page_size: 50 },
    })
    return toEvents(data.data ?? [])
  },
}
