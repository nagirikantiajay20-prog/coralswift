import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  partnerDashboardService as s,
  type PartnerApplication,
} from '../services/partnerDashboardService'

/** Most recently submitted application; drafts (no submitted_at) fall back to list order. */
export function latestApplication(apps: PartnerApplication[] | undefined) {
  if (!apps?.length) return undefined
  return [...apps].sort((a, b) => (b.submitted_at ?? '').localeCompare(a.submitted_at ?? ''))[0]
}

/**
 * Independent queries so one failing endpoint never blanks the page. Keys include the signed-in
 * partner id so cached data can never be shown to a different partner session.
 */
export function usePartnerDashboard() {
  const pid = useAuthStore((st) => st.partner?.id)
  const o = { staleTime: 60_000, retry: 1, enabled: !!pid }
  const applications = useQuery({
    queryKey: ['partner', pid, 'applications'],
    queryFn: s.applications,
    ...o,
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
  const notifications = useQuery({
    queryKey: ['partner', pid, 'notifications', 5],
    queryFn: s.notifications,
    ...o,
  })
  const enquiries = useQuery({
    queryKey: ['partner', pid, 'enquiries'],
    queryFn: s.enquiries,
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
  return { applications, app, completion, documents, notifications, enquiries, history, messages }
}
