import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { Fetched } from '@/features/reports/utils/aggregate'
import { dashboardService } from '../services/dashboardService'
import type { DateRange, EnquiryRow } from '../types'

/**
 * One query per endpoint, enabled only when the role may use that module, so a role never
 * calls an endpoint it is not allowed to (BD manager: enquiries; reviewer: applications/partners).
 */
export function useDashboardData(range: DateRange) {
  const { can } = useAuth()
  const o = { staleTime: 60_000, retry: 1 }
  const access = {
    enquiries: can('enquiries'),
    applications: can('applicationReviews'),
    partners: can('partners'),
    reports: can('reports'),
    documents: can('documents'),
  }
  const enquiries = useQuery({
    queryKey: ['dash', 'enquiries', range],
    queryFn: () => dashboardService.enquiries(range),
    enabled: access.enquiries,
    // Strategic/M&A rows never feed dashboard metrics for roles without strategic access.
    select: (f: Fetched<EnquiryRow>) =>
      can('strategicEnquiries')
        ? f
        : { ...f, rows: f.rows.filter((r) => r.enquiry_type !== 'strategic') },
    ...o,
  })
  const applications = useQuery({
    queryKey: ['dash', 'applications'],
    queryFn: dashboardService.applications,
    enabled: access.applications,
    ...o,
  })
  const organizations = useQuery({
    queryKey: ['dash', 'orgs'],
    queryFn: dashboardService.activeOrganizations,
    enabled: access.partners,
    ...o,
  })
  const overview = useQuery({
    queryKey: ['dash', 'overview'],
    queryFn: dashboardService.overview,
    ...o,
  })
  const kpis = useQuery({
    queryKey: ['dash', 'kpis', range],
    queryFn: () => dashboardService.kpis(range),
    enabled: access.reports,
    ...o,
  })
  const onboarding = useQuery({
    queryKey: ['dash', 'onboarding'],
    queryFn: dashboardService.onboarding,
    enabled: access.applications,
    ...o,
  })
  const pendingDocs = useQuery({
    queryKey: ['dash', 'pending-docs'],
    queryFn: dashboardService.pendingDocuments,
    enabled: access.documents,
    ...o,
  })
  const all = [enquiries, applications, organizations, overview, kpis, onboarding, pendingDocs]
  return {
    enquiries,
    applications,
    organizations,
    overview,
    kpis,
    onboarding,
    pendingDocs,
    access,
    refreshing: all.some((q) => q.isFetching),
    refetchAll: () => all.forEach((q) => void (q.isEnabled && q.refetch())),
  }
}
