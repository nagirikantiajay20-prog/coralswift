import { accountEndpoints, type AccountAction } from '@/config/endpoints'
import { api } from '@/services/api/client'
import { toEvents } from '../utils/accounts'
import { fetchAll } from '@/features/reports/utils/aggregate'
import type { AccountDetail, AccountRow, ApiList, AuditRow } from '../types'

/** Backend AccountMetricsOut (GET /admin/accounts/metrics, super administrator). */
export interface AccountMetrics {
  total_accounts: number
  accounts_by_type: Record<string, number>
  accounts_by_status: Record<string, number>
  staff_by_role: Record<string, number>
  active_partner_accounts: number
  accounts_never_logged_in: number
}

export const partnerAccountsService = {
  metrics: async () =>
    (await api.get<{ data: AccountMetrics | null }>(accountEndpoints.accountMetrics)).data.data,
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
  /** One account with its recent activity (super administrator). */
  detail: async (userId: string) =>
    (await api.get<{ data: AccountDetail }>(`${accountEndpoints.accounts}/${userId}`)).data.data,
  /**
   * Partner accounts of one organization. The list endpoint has no organization filter, so all
   * partner accounts are paged (100/page, up to the safety ceiling) and matched on
   * `organization.id`; `partial` is true if the ceiling cut the list short.
   */
  async ofOrganization(orgId: string) {
    const f = await fetchAll(async (page) => {
      const { data } = await api.get<ApiList<AccountRow>>(accountEndpoints.accounts, {
        params: { user_type: 'partner', page, page_size: 100 },
      })
      return { rows: data.data ?? [], meta: data.meta ?? null }
    })
    return { rows: f.rows.filter((a) => a.organization?.id === orgId), partial: f.partial }
  },
}
