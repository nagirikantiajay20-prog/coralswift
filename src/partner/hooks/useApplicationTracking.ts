import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { partnerDashboardService as s } from '../services/partnerDashboardService'
import { partnerDocumentService as docs } from '../services/partnerDocumentService'
import { latestApplication } from './usePartnerDashboard'

/** Same query keys as the dashboard/documents hooks, so cached responses are shared (no duplicate calls). */
export function useApplicationTracking() {
  const pid = useAuthStore((st) => st.partner?.id)
  const qc = useQueryClient()
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
  const respond = useMutation({
    mutationFn: (v: { inReplyTo: string; body: string }) =>
      docs.respond(app!.id, v.inReplyTo, v.body),
    onSuccess: () => {
      toast.success('Response sent')
      void qc.invalidateQueries({ queryKey: ['partner', pid, 'messages'] })
      void qc.invalidateQueries({ queryKey: ['partner', pid, 'applications'] })
    },
    onError: () => toast.error('Your response could not be sent. Try again.'),
  })
  return { applications, app, history, messages, respond }
}
