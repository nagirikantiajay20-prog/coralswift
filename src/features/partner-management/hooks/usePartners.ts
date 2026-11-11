import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toAppError } from '@/services/api/errors'
import { partnerManagementService as svc } from '../services/partnerManagementService'
import { metaTotal } from '../utils/partners'
import type { ListParams, OrgStatus, StatusBody } from '../types'

export const usePartnerList = (p: ListParams) =>
  useQuery({
    queryKey: ['partners', 'list', p],
    queryFn: () => svc.list(p),
    placeholderData: (prev) => prev,
  })

/** Global totals come from backend `meta.total` of a 1-row query per status, never from counting a page. */
export const usePartnerTotal = (status?: OrgStatus) =>
  useQuery({
    queryKey: ['partners', 'total', status ?? 'all'],
    queryFn: async () =>
      metaTotal((await svc.list({ status, page: 1, page_size: 1 })).meta) ?? null,
    retry: false,
  })

export const usePartnerDetail = (id: string) =>
  useQuery({ queryKey: ['partners', 'detail', id], queryFn: () => svc.detail(id), retry: false })

export function useSetPartnerStatus(id: string, onDone: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: StatusBody) => svc.setStatus(id, b),
    onSuccess: async () => {
      toast.success('Partner status updated')
      await qc.invalidateQueries({ queryKey: ['partners'] })
      onDone()
    },
    onError: (e) => toast.error(toAppError(e).message),
  })
}

export const usePartnerRevisions = (id: string) =>
  useQuery({
    queryKey: ['partners', 'revisions', id],
    queryFn: () => svc.revisions(id),
    retry: false,
  })

export const usePartnerActivity = (id: string) =>
  useQuery({
    queryKey: ['partners', 'activity', id],
    queryFn: () => svc.activity(id),
    retry: false,
  })
