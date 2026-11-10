import { useQuery } from '@tanstack/react-query'
import { Briefcase } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toAppError } from '@/services/api/errors'
import { useAuthStore } from '@/store/authStore'
import { PARTNER_ROUTES as R } from '../config/routes'
import { partnerDashboardService as s } from '../services/partnerDashboardService'
import { pathwayLabel } from '../utils/engagement'

/**
 * Phase 30. The backend (openapi.json, 2026-11-10) has NO partner-facing project, engagement,
 * milestone or assignment endpoints, so no project list/detail/actions exist here. This page
 * shows only what is real: the engagement pathway on the partner's own application, and says
 * plainly that project assignments are not available. See PARTNER_PORTAL_ARCHITECTURE.md §Phase 30.
 */
export default function PartnerProjectsPage() {
  const pid = useAuthStore((st) => st.partner?.id)
  // Same key as the dashboard so the cache is shared.
  const q = useQuery({
    queryKey: ['partner', pid, 'applications'],
    queryFn: s.applications,
    enabled: !!pid,
    staleTime: 60_000,
  })
  const pathways = [...new Set((q.data ?? []).map((a) => a.pathway).filter(Boolean))] as string[]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects & engagements"
        description="Project assignments shared with you by Coral Swift."
      />
      <Card>
        <CardHeader>
          <CardTitle>Project assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Briefcase}
            title="Project visibility is not yet available"
            description="Coral Swift has not enabled project or engagement sharing in the Partner Portal. Having an application or an engagement pathway does not mean a project has been assigned or allocated to you. Your Coral Swift contact will inform you directly of any assignment."
          />
        </CardContent>
      </Card>
      <Card aria-busy={q.isLoading}>
        <CardHeader>
          <CardTitle>Engagement pathway from your application</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {q.isLoading ? (
            <LoadingState />
          ) : q.isError ? (
            <ErrorState message={toAppError(q.error).message} onRetry={() => q.refetch()} />
          ) : !pathways.length ? (
            <p className="text-muted">No application on record.</p>
          ) : (
            <ul className="space-y-1">
              {pathways.map((p) => (
                <li key={p}>
                  <StatusBadge label={pathwayLabel(p)!} />
                </li>
              ))}
            </ul>
          )}
          <p className="text-muted">
            This is the pathway you applied for, not a project or contract.{' '}
            <Link to={R.application} className="text-coral-ink hover:underline">
              View application
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
