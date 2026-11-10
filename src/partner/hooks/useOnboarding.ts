import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { partnerDashboardService as s } from '../services/partnerDashboardService'
import { latestApplication } from './usePartnerDashboard'

/**
 * Read-only. Reuses the dashboard/application/documents query keys (all include the partner id),
 * so no extra requests are made when those modules are already cached. No onboarding endpoint
 * exists in the backend, so none is called.
 */
export function useOnboarding() {
  const pid = useAuthStore((st) => st.partner?.id)
  const o = { staleTime: 60_000, retry: 1, enabled: !!pid }
  const applications = useQuery({
    queryKey: ['partner', pid, 'applications'],
    queryFn: s.applications,
    ...o,
  })
  const app = latestApplication(applications.data)
  const dep = { ...o, enabled: !!pid && !!app }
  const history = useQuery({
    queryKey: ['partner', pid, 'history', app?.id],
    queryFn: () => s.history(app!.id),
    ...dep,
  })
  const messages = useQuery({
    queryKey: ['partner', pid, 'messages', app?.id],
    queryFn: () => s.messages(app!.id),
    ...dep,
  })
  const completion = useQuery({
    queryKey: ['partner', pid, 'completion'],
    queryFn: s.completion,
    ...o,
  })
  const documents = useQuery({
    queryKey: ['partner', pid, 'documents'],
    queryFn: s.documents,
    ...o,
  })
  return { applications, app, history, messages, completion, documents }
}
