import { useQuery } from '@tanstack/react-query'
import { BarChart3 } from 'lucide-react'
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
 * Phase 34. The backend (openapi.json, 2026-11-10 snapshot) has NO partner-facing performance,
 * scorecard, feedback, milestone, engagement or export endpoints, and the only reports are
 * staff-only CSVs. So no metric, score, trend or export exists here. This page shows the
 * verified feasibility table and the one real history signal: the partner's own applications.
 * See PARTNER_PORTAL_ARCHITECTURE.md §Phase 34.
 */
export const FEASIBILITY: { feature: string; support: string; status: string }[] = [
  { feature: 'Project history', support: 'No partner project endpoint', status: 'Not available' },
  {
    feature: 'Engagement history',
    support: 'Only own applications (GET /partner/applications)',
    status: 'Applications only',
  },
  { feature: 'Project status', support: 'None', status: 'Not available' },
  { feature: 'Delivery milestones', support: 'None', status: 'Not available' },
  {
    feature: 'Partner feedback',
    support: 'Only reviewer messages on an application (Messages page)',
    status: 'Not available as feedback',
  },
  { feature: 'Performance indicators', support: 'None', status: 'Not available' },
  { feature: 'Performance scorecards', support: 'None', status: 'Not available' },
  { feature: 'Historical trends', support: 'None', status: 'Not available' },
  {
    feature: 'Partner comparisons',
    support: 'None (and not partner-appropriate)',
    status: 'Not available',
  },
  {
    feature: 'Reports / exports',
    support: 'Staff-only CSVs under /admin/reports',
    status: 'Not available',
  },
]

const date = (v: string | null) => (v ? new Date(v).toLocaleDateString() : 'Not submitted')

export default function PartnerPerformancePage() {
  const pid = useAuthStore((st) => st.partner?.id)
  // Same key as the dashboard so the cache is shared.
  const q = useQuery({
    queryKey: ['partner', pid, 'applications'],
    queryFn: s.applications,
    enabled: !!pid,
    staleTime: 60_000,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance overview"
        description="Performance information shared with your organization by Coral Swift."
      />
      <Card>
        <CardHeader>
          <CardTitle>Performance scorecards and indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={BarChart3}
            title="Performance reporting is not yet available"
            description="Coral Swift has not enabled performance indicators, scorecards, feedback, trends or reports in the Partner Portal. No scores or percentages are shown because none are provided. Your Coral Swift contact will share any evaluation with you directly."
          />
        </CardContent>
      </Card>
      <Card aria-busy={q.isLoading}>
        <CardHeader>
          <CardTitle>Your application history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {q.isLoading ? (
            <LoadingState />
          ) : q.isError ? (
            <ErrorState message={toAppError(q.error).message} onRetry={() => q.refetch()} />
          ) : !q.data?.length ? (
            <p className="text-muted">No application on record.</p>
          ) : (
            <ul className="divide-y divide-border">
              {q.data.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className="font-medium">{a.reference}</span>
                    {a.pathway && <span className="text-muted"> · {pathwayLabel(a.pathway)}</span>}
                    <span className="text-muted"> · Submitted: {date(a.submitted_at)}</span>
                  </span>
                  <StatusBadge label={a.status_label} />
                </li>
              ))}
            </ul>
          )}
          <p className="text-muted">
            These are applications, not projects or engagements, and do not imply any assignment.{' '}
            <Link to={R.application} className="text-coral-ink hover:underline">
              View application
            </Link>
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>What is supported today</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Performance feature availability</caption>
            <thead>
              <tr className="text-muted">
                <th scope="col" className="py-1 pr-4">
                  Feature
                </th>
                <th scope="col" className="py-1 pr-4">
                  Backend support
                </th>
                <th scope="col" className="py-1">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {FEASIBILITY.map((r) => (
                <tr key={r.feature} className="border-t border-border">
                  <th scope="row" className="py-1 pr-4 font-medium">
                    {r.feature}
                  </th>
                  <td className="py-1 pr-4">{r.support}</td>
                  <td className="py-1">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
