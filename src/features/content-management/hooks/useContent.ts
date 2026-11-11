import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ContentAction } from '@/config/endpoints'
import { toAppError } from '@/services/api/errors'
import { contentManagementService as svc } from '../services/contentManagementService'
import type {
  ClaimCategory,
  ClaimStatus,
  ContentListParams,
  ContentPatch,
  ContentStatus,
} from '../types'
import { metaTotal } from '../utils/content'

const onError = (e: unknown) => toast.error(toAppError(e).message)

export const useContentList = (p: ContentListParams) =>
  useQuery({
    queryKey: ['cms', 'list', p],
    queryFn: () => svc.list(p),
    placeholderData: (prev) => prev,
    retry: false,
  })

/** Exact total = backend meta.total of a 1-row query; null when the backend omits it. */
export const useContentTotal = (status?: ContentStatus) =>
  useQuery({
    queryKey: ['cms', 'total', status ?? 'all'],
    queryFn: async () =>
      metaTotal((await svc.list({ status, page: 1, page_size: 1 })).meta) ?? null,
    retry: false,
  })

export const useContentItem = (id: string | undefined) =>
  useQuery({
    queryKey: ['cms', 'item', id],
    queryFn: () => svc.get(id!),
    enabled: !!id,
    retry: false,
  })

export const useVersions = (id: string | undefined) =>
  useQuery({
    queryKey: ['cms', 'versions', id],
    queryFn: () => svc.versions(id!),
    enabled: !!id,
    retry: false,
  })

export const useClaims = (p: {
  status?: ClaimStatus
  category?: ClaimCategory
  page: number
  page_size: number
}) =>
  useQuery({
    queryKey: ['cms', 'claims', p],
    queryFn: () => svc.claims(p),
    placeholderData: (prev) => prev,
    retry: false,
  })

// Create/update surface backend validation (409 slug taken, 422) inline, so no global onError.
export function useCreateContent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: svc.create,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['cms'] }),
  })
}

export function useUpdateContent(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ContentPatch) => svc.update(id, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['cms'] }),
  })
}

/** Success is only announced after the backend returns the updated item. */
export function useContentAction(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ action, note }: { action: ContentAction; note?: string }) =>
      svc.act(id, action, note),
    onSuccess: (item, { action }) => {
      toast.success(
        action === 'publish'
          ? 'Server confirmed: content is published.'
          : `Done. Status is now “${item.status}”.`,
      )
      void qc.invalidateQueries({ queryKey: ['cms'] })
    },
    onError,
  })
}

export function useSchedule(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (publishAt: string | null) =>
      publishAt ? svc.schedule(id, publishAt) : svc.cancelSchedule(id),
    onSuccess: (_i, publishAt) => {
      toast.success(publishAt ? 'Publication scheduled.' : 'Schedule cancelled.')
      void qc.invalidateQueries({ queryKey: ['cms'] })
    },
    onError,
  })
}

export function useAttach(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, label }: { file: File; label?: string }) => svc.attach(id, file, label),
    onSuccess: () => {
      toast.success('Attachment uploaded.')
      void qc.invalidateQueries({ queryKey: ['cms'] })
    },
    onError,
  })
}

export function useCreateClaim() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: svc.createClaim,
    onSuccess: () => {
      toast.success('Claim registered as pending verification.')
      void qc.invalidateQueries({ queryKey: ['cms', 'claims'] })
    },
    onError,
  })
}

export function useUpdateClaim() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof svc.updateClaim>[1] }) =>
      svc.updateClaim(id, body),
    onSuccess: () => {
      toast.success('Claim updated. Un-clearing a claim pulls linked content offline.')
      void qc.invalidateQueries({ queryKey: ['cms'] })
    },
    onError,
  })
}
