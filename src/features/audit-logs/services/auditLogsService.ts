import { accountEndpoints } from '@/config/endpoints'
import { api } from '@/services/api/client'
import type { ApiList, AuditFilters, AuditRowRaw } from '../types'

export const PAGE_SIZE = 20

const params = (f: Partial<AuditFilters>) => ({
  action: f.action || undefined,
  record_type: f.recordType || undefined,
  actor_user_id: f.actorUserId || undefined,
  created_from: f.from,
  created_to: f.to,
})

/** Read-only: the backend exposes GET only (no create/edit/delete, no get-by-id). */
export const auditLogsService = {
  list: async (f: AuditFilters, page: number, pageSize = PAGE_SIZE) => {
    const { data } = await api.get<ApiList<AuditRowRaw>>(accountEndpoints.audit, {
      params: { ...params(f), page, page_size: pageSize },
    })
    return { rows: data.data ?? [], meta: data.meta }
  },
  /** Exact count via `meta.total` of a 1-row query; undefined when the backend omits it. */
  count: async (f: Partial<AuditFilters>) => {
    const { data } = await api.get<ApiList<AuditRowRaw>>(accountEndpoints.audit, {
      params: { ...params(f), page: 1, page_size: 1 },
    })
    const t = data.meta?.total
    return typeof t === 'number' ? t : undefined
  },
}
