import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toAppError } from '@/services/api/errors'
import { communicationService as svc } from '../services/communicationService'
import type { DeliveryStatus, OutboxParams, TemplateBody } from '../types'
import { metaTotal } from '../utils/communication'

export const useOutbox = (p: OutboxParams) =>
  useQuery({
    queryKey: ['comms', 'outbox', p],
    queryFn: () => svc.outbox(p),
    placeholderData: (prev) => prev,
    retry: false,
  })

/** Exact total = backend meta.total of a 1-row query; null when the backend omits it. */
export const useOutboxTotal = (status: DeliveryStatus) =>
  useQuery({
    queryKey: ['comms', 'total', status],
    queryFn: async () =>
      metaTotal((await svc.outbox({ status, page: 1, page_size: 1 })).meta) ?? null,
    retry: false,
  })

export const useTemplates = () =>
  useQuery({ queryKey: ['comms', 'templates'], queryFn: svc.templates, retry: false })

const onError = (e: unknown) => toast.error(toAppError(e).message)

export function useRetry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: svc.retry,
    onSuccess: () => {
      toast.success('Email reset for retry. Check its status after the next dispatch.')
      void qc.invalidateQueries({ queryKey: ['comms'] })
    },
    onError,
  })
}

export function useDispatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: svc.dispatch,
    onSuccess: () => {
      toast.success(
        'Dispatch accepted. Emails are retried in the background; refresh to see results.',
      )
      void qc.invalidateQueries({ queryKey: ['comms'] })
    },
    onError,
  })
}

export const usePreview = () =>
  useMutation({
    mutationFn: ({ key, body }: { key: string; body: TemplateBody }) => svc.preview(key, body),
    onError,
  })

export function useSaveTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, body }: { key: string; body: TemplateBody }) => svc.saveTemplate(key, body),
    onSuccess: () => {
      toast.success('Template saved.')
      void qc.invalidateQueries({ queryKey: ['comms', 'templates'] })
    },
    onError,
  })
}

export function useRevertTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: svc.revertTemplate,
    onSuccess: () => {
      toast.success('Reverted to the built-in template.')
      void qc.invalidateQueries({ queryKey: ['comms', 'templates'] })
    },
    onError,
  })
}
