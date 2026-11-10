import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toAppError } from '@/services/api/errors'
import { businessEnquiriesService as svc } from '../services/businessEnquiriesService'
import type { EnquiryListParams } from '../types'

export const enquiryKeys = {
  list: (p: EnquiryListParams) => ['enquiries', 'list', p] as const,
  detail: (id: string) => ['enquiries', 'detail', id] as const,
}

export const useEnquiryList = (p: EnquiryListParams, enabled = true) =>
  useQuery({
    queryKey: enquiryKeys.list(p),
    queryFn: () => svc.list(p),
    placeholderData: (prev) => prev,
    enabled,
  })

export const useEnquiryDetail = (id: string) =>
  useQuery({
    queryKey: enquiryKeys.detail(id),
    queryFn: async () => {
      const d = await svc.detail(id)
      if (!d) throw new Error('Enquiry not found')
      return d
    },
  })

export const useStaff = (enabled: boolean) =>
  useQuery({
    queryKey: ['enquiries', 'staff'],
    queryFn: () => svc.staff('business_development_manager'),
    enabled,
    retry: false,
  })

/** Runs a mutation, toasts the outcome (backend message on failure) and refreshes all enquiry data. */
export function useEnquiryMutation<V>(
  fn: (v: V) => Promise<unknown>,
  success: string,
  onDone?: () => void,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      toast.success(success)
      await qc.invalidateQueries({ queryKey: ['enquiries'] })
      await qc.invalidateQueries({ queryKey: ['dash'] })
      onDone?.()
    },
    onError: (e) => toast.error(toAppError(e).message),
  })
}
