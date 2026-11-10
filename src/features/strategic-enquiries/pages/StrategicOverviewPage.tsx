import { CalendarClock, CheckCircle2, Clock, Inbox, RefreshCw, UserX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BarChartCard } from '@/components/charts/BarChartCard'
import { DataTable } from '@/components/common/DataTable'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EnquiryStatusBadge } from '@/features/business-enquiries/components/EnquiryBadges'
import { useEnquiryList } from '@/features/business-enquiries/hooks/useEnquiries'
import { countBy, dailyCounts, newest } from '@/features/dashboard/utils/transform'
import { formatDate, humanize } from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { ConfidentialBanner } from '../components/ConfidentialBanner'
import { summarizeStrategic } from '../utils/strategic'

const LIMIT = 100 // API page_size maximum; counts are computed from this one page.
const BASE = '/admin/strategic-enquiries'

export default function StrategicOverviewPage() {
  const q = useEnquiryList({ page: 1, page_size: LIMIT, type: 'strategic' })
  const rows = q.data?.rows ?? []
  const s = summarizeStrategic(rows)
  const loading = q.isPending
  const pending = rows
    .filter((r) => r.status !== 'closed' && r.next_follow_up_at)
    .sort((a, b) => a.next_follow_up_at!.localeCompare(b.next_follow_up_at!))
    .slice(0, 5)

  return (
    <>
      <PageHeader
        title="Strategic Enquiry Overview"
        description="Snapshot of confidential strategic / M&A enquiries."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link to={BASE}>All strategic enquiries</Link>
            </Button>
            <Button variant="secondary" onClick={() => q.refetch()} disabled={q.isFetching}>
              <RefreshCw className={q.isFetching ? 'size-4 animate-spin' : 'size-4'} aria-hidden />
              Refresh
            </Button>
          </>
        }
      />
      <ConfidentialBanner />
      {q.isError ? (
        <ErrorState message={toAppError(q.error).message} onRetry={() => q.refetch()} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total strategic" value={s.total} icon={Inbox} loading={loading} />
            <StatCard label="New (received)" value={s.received} icon={Inbox} loading={loading} />
            <StatCard
              label="Under assessment"
              hint="Status: in review"
              value={s.inReview}
              icon={Clock}
              loading={loading}
            />
            <StatCard
              label="Completed"
              hint="Status: closed"
              value={s.closed}
              icon={CheckCircle2}
              loading={loading}
            />
            <StatCard
              label="Pending follow-ups"
              value={s.pendingFollowUps}
              icon={CalendarClock}
              loading={loading}
            />
            <StatCard
              label="Unassigned (open)"
              value={s.unassigned}
              icon={UserX}
              loading={loading}
            />
          </div>
          <p className="text-xs text-muted">
            {rows.length >= LIMIT &&
              `Counts cover the latest ${LIMIT} enquiries (API page limit). `}
            The backend defines only received, in review and closed. “Active discussions” and
            “Awaiting decisions” have no backend source and are not shown.
          </p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BarChartCard
              title="Strategic enquiry trend (per day)"
              data={dailyCounts(rows, (r) => r.created_at).map((d) => ({
                name: d.day.slice(5),
                value: d.value,
              }))}
            />
            <BarChartCard
              title="Status distribution"
              data={[...countBy(rows, (r) => r.status)].map(([k, value]) => ({
                name: humanize(k),
                value,
              }))}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Recent submissions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                rows={newest(rows, (r) => r.created_at)}
                rowKey={(r) => r.id}
                emptyTitle="No strategic enquiries yet"
                columns={[
                  {
                    header: 'Reference',
                    cell: (r) => (
                      <Link to={`${BASE}/${r.id}`} className="font-medium text-coral-ink underline">
                        {r.reference_number}
                      </Link>
                    ),
                  },
                  { header: 'Organization', cell: (r) => r.company_name ?? '—' },
                  { header: 'Status', cell: (r) => <EnquiryStatusBadge status={r.status} /> },
                  { header: 'Submitted', cell: (r) => formatDate(r.created_at) },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pending actions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>{s.unassigned} open enquiries have no owner</li>
                <li>{s.overdue} open enquiries have an overdue follow-up</li>
                {pending.map((r) => (
                  <li key={r.id}>
                    <Link className="underline" to={`${BASE}/${r.id}`}>
                      {r.reference_number}
                    </Link>{' '}
                    · follow-up {formatDate(r.next_follow_up_at)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
