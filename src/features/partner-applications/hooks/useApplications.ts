import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toAppError } from '@/services/api/errors'
import { partnerApplicationsService as svc } from '../services/partnerApplicationsService'
import type { ListParams } from '../types'

export const appKeys = {
  list: (p: ListParams) => ['applications', 'list', p] as const,
  detail: (id: string) => ['applications', 'detail', id] as const,
  notes: (id: string) => ['applications', id, 'notes'] as const,
  messages: (id: string) => ['applications', id, 'messages'] as const,
  audit: (id: string) => ['applications', id, 'audit'] as const,
}

export const useApplicationList = (p: ListParams) =>
  useQuery({
    queryKey: appKeys.list(p),
    queryFn: () => svc.list(p),
    placeholderData: (prev) => prev,
  })

export const useApplicationDetail = (id: string) =>
  useQuery({ queryKey: appKeys.detail(id), queryFn: () => svc.detail(id) })
export const useNotes = (id: string) =>
  useQuery({ queryKey: appKeys.notes(id), queryFn: () => svc.notes(id) })
export const useMessages = (id: string) =>
  useQuery({ queryKey: appKeys.messages(id), queryFn: () => svc.messages(id) })
export const useAudit = (id: string) =>
  useQuery({ queryKey: appKeys.audit(id), queryFn: () => svc.audit(id), retry: false })
/** Backend transition requirements; static per deploy, so cached for an hour. Failure falls back to local rules. */
export const useTransitionRules = () =>
  useQuery({
    queryKey: ['applications', 'transitions'],
    queryFn: svc.transitions,
    staleTime: 3_600_000,
    retry: false,
  })
export const useReviewers = (enabled: boolean) =>
  useQuery({ queryKey: ['reviewers'], queryFn: svc.reviewers, enabled, retry: false })

/** Runs a mutation, toasts the outcome (backend message on failure) and refreshes all application data. */
export function useAppMutation<V>(
  fn: (v: V) => Promise<unknown>,
  success: string,
  onDone?: () => void,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      toast.success(success)
      await qc.invalidateQueries({ queryKey: ['applications'] })
      onDone?.()
    },
    onError: (e) => toast.error(toAppError(e).message),
  })
}
