import { governanceEndpoints as e } from '@/config/endpoints'
import { api } from '@/services/api/client'

export const PRIVACY_STATUSES = ['received', 'in_progress', 'completed', 'rejected'] as const
export type PrivacyStatus = (typeof PRIVACY_STATUSES)[number]

export interface PrivacyRequest {
  id: string
  reference: string
  email: string
  kind: 'access' | 'correction' | 'deletion'
  details: string | null
  status: PrivacyStatus
  resolution_note: string | null
  created_at: string
}
export interface ChangeRequest {
  id: string
  organization_id: string
  changes: Record<string, unknown>
  reason: string
  status: string
  decision_note: string | null
  created_at: string
  decided_at: string | null
}
interface List<T> {
  data: T[] | null
  meta: Record<string, unknown> | null
}

/** Backend executes only "in-progress deletion requests". */
export const canExecute = (r: PrivacyRequest) => r.kind === 'deletion' && r.status === 'in_progress'

export const governanceService = {
  privacy: async (status?: string) => {
    const { data } = await api.get<List<PrivacyRequest>>(e.privacy, {
      params: { status: status || undefined, page_size: 100 },
    })
    return { rows: data.data ?? [], total: data.meta?.total as number | undefined }
  },
  setPrivacy: (id: string, status: PrivacyStatus, resolution_note?: string) =>
    api.post(e.privacyItem(id), { status, resolution_note: resolution_note || null }),
  executeDeletion: async (id: string) =>
    (await api.post<{ data: Record<string, number> | null }>(e.privacyExecute(id))).data.data ?? {},
  changes: async (status?: string) =>
    (await api.get<List<ChangeRequest>>(e.changes, { params: { status: status || undefined } }))
      .data.data ?? [],
  decide: (id: string, approve: boolean, note?: string) =>
    api.post(e.decide(id), { approve, note: note || null }),
  readiness: async () =>
    (await api.get<{ data: Record<string, unknown> | null }>(e.readiness)).data.data ?? {},
}
