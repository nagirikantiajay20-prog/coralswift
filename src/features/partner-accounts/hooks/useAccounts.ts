import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AccountAction } from '@/config/endpoints'
import { partnerAccountsService } from '../services/partnerAccountsService'

export const useAccountEvents = (organizationId: string, enabled: boolean) =>
  useQuery({
    queryKey: ['partners', 'account-events', organizationId],
    queryFn: () => partnerAccountsService.events(organizationId),
    enabled,
    retry: false,
  })

export const useAccountList = (params: {
  q?: string
  status?: string
  page: number
  page_size: number
}) =>
  useQuery({
    queryKey: ['partners', 'accounts', params],
    queryFn: () => partnerAccountsService.list(params),
    retry: false,
  })

export const useAccountAction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; action: AccountAction }) =>
      partnerAccountsService.act(v.id, v.action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partners', 'accounts'] }),
  })
}
