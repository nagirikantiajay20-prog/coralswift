import { AlertTriangle, CheckCircle2, Clock, Inbox, RefreshCw, UserX, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BarChartCard } from '@/components/charts/BarChartCard'
import { DataTable } from '@/components/common/DataTable'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { countBy, dailyCounts, newest } from '@/features/dashboard/utils/transform'
import { formatDate, humanize } from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { EnquiryStatusBadge } from '../components/EnquiryBadges'
import { useEnquiryList } from '../hooks/useEnquiries'
import { summarize } from '../utils/format'

const LIMIT = 100 // API page_size maximum; counts below are computed from this one page.

/** Overview from real backend rows only. The backend defines three statuses (received, in_review, closed). */
export default function EnquiryOverviewPage() {
  const all = useEnquiryList({ page: 1, page_size: LIMIT })
  const sla = useEnquiryList({ page: 1, page_size: LIMIT, sla_breached: true })
  const rows = all.data?.rows ?? []
  const s = summarize(rows)
  const loading = all.isPending
  const err = all.isError

  return (
    <>
      <PageHeader
        title="Enquiry Overview"
        description="Snapshot of the latest enquiries submitted through the Public Portal."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link to="/admin/enquiries">All enquiries</Link>
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                void all.refetch()
                void sla.refetch()
              }}
              disabled={all.isFetching}
            >
              <RefreshCw
                className={all.isFetching ? 'size-4 animate-spin' : 'size-4'}
                aria-hidden
              />
              Refresh
            </Button>
          </>
        }
      />
      {err && <ErrorState message={toAppError(all.error).message} onRetry={() => all.refetch()} />}
      {!err && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total enquiries" value={s.total} icon={Inbox} loading={loading} />
            <StatCard label="New (received)" value={s.received} icon={Inbox} loading={loading} />
            <StatCard label="In review" value={s.inReview} icon={Clock} loading={loading} />
            <StatCard label="Closed" value={s.closed} icon={CheckCircle2} loading={loading} />
            <StatCard
              label="Unassigned (open)"
              value={s.unassigned}
              icon={UserX}
              loading={loading}
            />
            <StatCard label="Overdue follow-ups" value={s.overdue} icon={Users} loading={loading} />
            <StatCard
              label="First response missed"
              value={sla.data?.rows.length}
              icon={AlertTriangle}
              loading={sla.isPending}
              error={sla.isError}
            />
          </div>
          {rows.length >= LIMIT && (
            <p className="text-xs text-muted">
              Counts cover the latest {LIMIT} enquiries (the API page limit; its list metadata has
              no documented total).
            </p>
          )}
          <p className="text-xs text-muted">
            The backend defines only the statuses received, in review and closed; “Open”, “Awaiting
            response” and “Completed” do not exist and are not shown.
          </p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BarChartCard
              title="Enquiry trend (per day)"
              data={dailyCounts(rows, (r) => r.created_at).map((d) => ({
                name: d.day.slice(5),
                value: d.value,
              }))}
            />
            <BarChartCard
              title="Enquiries by type"
              data={[...countBy(rows, (r) => r.enquiry_type)].map(([k, value]) => ({
                name: humanize(k),
                value,
              }))}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Recent enquiries</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                rows={newest(rows, (r) => r.created_at)}
                rowKey={(r) => r.id}
                emptyTitle="No enquiries yet"
                columns={[
                  {
                    header: 'Reference',
                    cell: (r) => (
                      <Link
                        to={`/admin/enquiries/${r.id}`}
                        className="font-medium text-coral-ink underline"
                      >
                        {r.reference_number}
                      </Link>
                    ),
                  },
                  { header: 'Contact', cell: (r) => r.contact_name ?? '—' },
                  { header: 'Type', cell: (r) => humanize(r.enquiry_type) },
                  { header: 'Status', cell: (r) => <EnquiryStatusBadge status={r.status} /> },
                  { header: 'Submitted', cell: (r) => formatDate(r.created_at) },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pending administrative actions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link className="underline" to="/admin/enquiries">
                    {s.unassigned} open enquiries have no owner
                  </Link>
                </li>
                <li>{s.overdue} open enquiries have an overdue follow-up</li>
                <li>{sla.data?.rows.length ?? '—'} enquiries missed the first-response target</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
