import { contentEndpoints as e, type ContentAction } from '@/config/endpoints'
import { api } from '@/services/api/client'
import type {
  AdminContent,
  ApiList,
  Claim,
  ClaimCategory,
  ClaimStatus,
  ContentInput,
  ContentListParams,
  ContentPatch,
  ContentVersion,
} from '../types'

interface One<T> {
  data: T | null
}
const one = async <T>(p: Promise<{ data: One<T> }>) => {
  const d = (await p).data.data
  if (!d) throw new Error('The server returned no data.')
  return d
}

export const contentManagementService = {
  list: async (params: ContentListParams) => {
    const { data } = await api.get<ApiList<AdminContent>>(e.list, { params })
    return { rows: data.data ?? [], meta: data.meta }
  },
  get: (id: string) => one(api.get<One<AdminContent>>(e.detail(id))),
  create: (body: ContentInput) => one(api.post<One<AdminContent>>(e.list, body)),
  update: (id: string, body: ContentPatch) => one(api.patch<One<AdminContent>>(e.detail(id), body)),
  versions: async (id: string) =>
    (await api.get<ApiList<ContentVersion>>(e.versions(id))).data.data ?? [],
  /** approve: optional note; reject: required note; others send no body. */
  act: (id: string, action: ContentAction, note?: string) =>
    one(
      api.post<One<AdminContent>>(
        e.action(id, action),
        action === 'approve' || action === 'reject' ? { note: note ?? null } : undefined,
      ),
    ),
  attach: (id: string, file: File, versionLabel?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (versionLabel) form.append('version_label', versionLabel)
    return one(api.post<One<AdminContent>>(e.attachment(id), form))
  },
  claims: async (params: {
    status?: ClaimStatus
    category?: ClaimCategory
    page: number
    page_size: number
  }) => {
    const { data } = await api.get<ApiList<Claim>>(e.claims, { params })
    return { rows: data.data ?? [], meta: data.meta }
  },
  createClaim: (body: {
    claim_text: string
    category: ClaimCategory
    evidence_ref: string | null
  }) => one(api.post<One<Claim>>(e.claims, body)),
  /** evidence_status / publication_permission: verification is super administrator only (backend). */
  updateClaim: (
    id: string,
    body: Partial<
      Pick<
        Claim,
        'claim_text' | 'category' | 'evidence_ref' | 'evidence_status' | 'publication_permission'
      >
    >,
  ) => one(api.patch<One<Claim>>(e.claim(id), body)),
}
