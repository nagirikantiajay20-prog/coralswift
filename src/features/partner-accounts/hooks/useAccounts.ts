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

export const useAccountMetrics = () =>
  useQuery({
    queryKey: ['partners', 'account-metrics'],
    queryFn: partnerAccountsService.metrics,
    retry: false,
  })

export const useOrgAccounts = (orgId: string, enabled: boolean) =>
  useQuery({
    queryKey: ['partners', 'org-accounts', orgId],
    queryFn: () => partnerAccountsService.ofOrganization(orgId),
    enabled,
    retry: false,
  })

export const useAccountDetail = (userId: string) =>
  useQuery({
    queryKey: ['partners', 'account-detail', userId],
    queryFn: () => partnerAccountsService.detail(userId),
    retry: false,
  })
