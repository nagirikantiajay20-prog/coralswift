import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  partnerProfileService as s,
  type Organization,
  type ProfileChanges,
} from '../services/partnerProfileService'
import { partnerDashboardService } from '../services/partnerDashboardService'

/**
 * Keys include the signed-in partner id so cache never crosses sessions. The completion key is the
 * same one the dashboard uses, so both always show the backend's single completion result.
 */
export function usePartnerProfile() {
  const pid = useAuthStore((st) => st.partner?.id)
  const qc = useQueryClient()
  const o = { staleTime: 30_000, retry: 1, enabled: !!pid }
  const key = (k: string) => ['partner', pid, k]
  const organization = useQuery({ queryKey: key('organization'), queryFn: s.get, ...o })
  const completion = useQuery({
    queryKey: key('completion'),
    queryFn: partnerDashboardService.completion,
    ...o,
  })
  const requests = useQuery({ queryKey: key('change-requests'), queryFn: s.requests, ...o })
  const history = useQuery({ queryKey: key('profile-history'), queryFn: s.history, ...o })

  const refresh = (names: string[]) =>
    Promise.all(names.map((k) => qc.invalidateQueries({ queryKey: key(k) })))

  const save = useMutation({
    mutationFn: (v: { changes: ProfileChanges; version: number }) => s.update(v.changes, v.version),
    onSuccess: (org: Organization | null) => {
      if (org) qc.setQueryData(key('organization'), org)
      void refresh(['completion', 'profile-history'])
    },
    // Stale version (409): reload so the partner edits current data.
    onError: () => void refresh(['organization']),
  })
  const request = useMutation({
    mutationFn: (v: { changes: ProfileChanges; reason: string }) => s.request(v.changes, v.reason),
    onSuccess: () => void refresh(['change-requests']),
  })
  return { organization, completion, requests, history, save, request }
}
