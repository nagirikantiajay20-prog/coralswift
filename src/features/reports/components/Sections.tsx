import { useMutation } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Inbox,
  Mail,
  UserX,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { DataTable } from '@/components/common/DataTable'
import { ErrorState, LoadingState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ENQUIRY_TYPES, type EnquiryType } from '@/features/business-enquiries/types'
import { ConfidentialBanner } from '@/features/strategic-enquiries/components/ConfidentialBanner'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { shortId, humanize } from '@/features/partner-applications/utils/format'
import {
  useApplicationCounts,
  useApplicationRows,
  useBackendKpis,
  useEnquiryMetrics,
  useEnquiryRows,
  useOutboxCounts,
  usePartnerCounts,
  usePartnerRows,
} from '../hooks/useReports'
import { reportsService } from '../services/reportsService'
import type { EnquiryScope, Metric, ReportFilters } from '../types'
import { bucketByDay, groupCount, type Fetched } from '../utils/aggregate'
import type { ResolvedRange } from '../utils/range'
import { DonutCard, HBarCard, LineCard, MetricCard, Note, metricData } from './ReportCharts'
import { numericEntries } from '@/features/dashboard/utils/transform'

interface SectionProps {
  range: ResolvedRange
  filters: ReportFilters
}
const get = (ms: Metric[] | undefined, key: string) => ms?.find((m) => m.key === key)
const stamp = () => new Date().toISOString().slice(0, 10)
const pct = (v: number, t?: number) => (t ? `${((v / t) * 100).toFixed(1)}%` : '—')

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
}
function Charts({ children }: { children: React.ReactNode }) {
  return <div className="mb-6 grid gap-4 lg:grid-cols-2">{children}</div>
}

/** Row-based charts: a failed or partial load is stated, never hidden. */
function RowsGate<T>({
  q,
  children,
}: {
  q: UseQueryResult<Fetched<T>>
  children: (f: Fetched<T>) => React.ReactNode
}) {
  if (q.isPending) return <LoadingState label="Loading record-level charts…" />
  if (q.isError || !q.data)
    return (
      <ErrorState
        message="Record-level charts could not be loaded."
        onRetry={() => void q.refetch()}
      />
    )
  const f = q.data
  return (
    <>
      {f.partial && (
        <Note>
          Partial dataset: record-level charts below use the first {f.rows.length.toLocaleString()}
          {f.total !== undefined ? ` of ${f.total.toLocaleString()}` : ''} records returned by the
          backend. Totals and status counts above are exact and unaffected.
        </Note>
      )}
      {children(f)}
    </>
  )
}

function MetricTable({
  title,
  metrics,
  total,
  to,
}: {
  title: string
  metrics?: Metric[]
  total?: number
  to?: string
}) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <DataTable
        rows={metrics ?? []}
        rowKey={(m) => m.key}
        columns={[
          { header: 'Category', cell: (m) => m.label },
          { header: 'Count', cell: (m) => (m.failed ? 'Unavailable' : m.value?.toLocaleString()) },
          { header: 'Share', cell: (m) => (m.value !== undefined ? pct(m.value, total) : '—') },
          {
            header: 'Records',
            cell: () =>
              to ? (
                <Link className="text-coral-ink underline" to={to}>
                  Open
                </Link>
              ) : (
                '—'
              ),
          },
        ]}
      />
    </Card>
  )
}

function Definitions({ children }: { children: React.ReactNode }) {
  return (
    <details className="mb-6 rounded-md border border-line p-3 text-sm">
      <summary className="cursor-pointer font-medium">Metric definitions</summary>
      <div className="mt-2 space-y-1 text-muted">{children}</div>
    </details>
  )
}

function ExportButton({
  run,
  disabledReason,
  label = 'Export CSV',
}: {
  run: () => Promise<void>
  disabledReason?: string
  label?: string
}) {
  const m = useMutation({
    mutationFn: run,
    onError: (e: Error) => toast.error(`Export failed: ${e.message}`),
  })
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Button
        variant="secondary"
        size="sm"
        disabled={!!disabledReason || m.isPending}
        onClick={() => m.mutate()}
      >
        <Download className="size-4" aria-hidden /> {m.isPending ? 'Exporting…' : label}
      </Button>
      <span className="text-xs text-muted">
        {disabledReason ??
          'Server-side export of the full filtered dataset (audited, capped at 10,000 rows by the backend).'}
      </span>
    </div>
  )
}

/* ---------------- Applications, review & onboarding ---------------- */
export function ApplicationsSection({ range }: SectionProps) {
  const { user } = useAuth()
  const counts = useApplicationCounts(true)
  const rows = useApplicationRows(true)
  const ms = counts.data
  const total = get(ms, 'total')
  const statuses = (ms ?? []).filter((m) => !['total', 'unassigned'].includes(m.key))
  const k = (key: string) => get(ms, key)
  const sum = (...keys: string[]) => {
    const parts = keys.map(k)
    return parts.every((p) => p?.value !== undefined)
      ? parts.reduce((a, p) => a + p!.value!, 0)
      : undefined
  }
  return (
    <>
      <Note>
        The backend applications list has no date filter, so the date range applies only to the
        submission trend (from loaded records). Counts cover all applications.
      </Note>
      <Grid>
        <MetricCard m={total} icon={FileText} to="/admin/applications" />
        <MetricCard
          m={k('submitted')}
          icon={Inbox}
          to="/admin/applications"
          hint="Submitted, not yet in review"
        />
        <MetricCard m={k('information_requested')} icon={Clock} to="/admin/application-reviews" />
        <MetricCard m={k('unassigned')} icon={UserX} to="/admin/application-reviews" />
      </Grid>
      <Charts>
        <DonutCard title="Applications by status" data={metricData(statuses)} />
        <DonutCard
          title="Review outcomes and onward stages"
          description="Rejected, withdrawn, or progressed to onboarding stages. Approval is a stage change, not a separate status."
          data={metricData(
            ['rejected', 'withdrawn', 'pilot_onboarding', 'scale_up']
              .map((x) => k(x))
              .filter((m): m is Metric => !!m),
          )}
        />
      </Charts>
      <Grid>
        <MetricCard
          m={{
            key: 'under_review',
            label: 'Under review',
            value: sum('eligibility_verification', 'capability_review', 'commercial_legal_review'),
            failed:
              sum('eligibility_verification', 'capability_review', 'commercial_legal_review') ===
              undefined,
          }}
          icon={Clock}
          to="/admin/application-reviews"
          hint="Eligibility + capability + commercial/legal"
        />
        <MetricCard
          m={{
            key: 'onb',
            label: 'In onboarding stages',
            value: sum('pilot_onboarding', 'scale_up'),
            failed: sum('pilot_onboarding', 'scale_up') === undefined,
          }}
          icon={CheckCircle2}
          to="/admin/onboarding"
          hint="Pilot onboarding + scale-up"
        />
      </Grid>
      <MetricTable
        title="Applications by status"
        metrics={statuses}
        total={total?.value}
        to="/admin/applications"
      />
      <RowsGate q={rows}>
        {(f) => (
          <Charts>
            <LineCard
              title="Applications submitted over time"
              description="By submission day within the selected range"
              data={bucketByDay(f.rows, (r) => r.submitted_at, range)}
            />
            <HBarCard
              title="Loaded applications by assigned reviewer"
              description="All statuses, loaded records only (ID shown; names are not available to this role). This is an assignment count, not open reviewer workload: the backend has no application workload endpoint."
              data={groupCount(f.rows, (r) =>
                r.assigned_reviewer_id ? `Reviewer ${shortId(r.assigned_reviewer_id)}` : null,
              )}
            />
          </Charts>
        )}
      </RowsGate>
      <Note>
        Unavailable: review turnaround time, onboarding progress/completion and duration, and
        document completion. The backend exposes no per-application timestamps in list data or
        aggregate endpoints for these.
      </Note>
      <Definitions>
        <p>
          <strong>Total applications</strong> = sum of the backend counts for every application
          status.
        </p>
        <p>
          <strong>Under review</strong> = eligibility_verification + capability_review +
          commercial_legal_review.
        </p>
        <p>
          <strong>In onboarding stages</strong> = pilot_onboarding + scale_up. Application status,
          onboarding and partner account activation are separate.
        </p>
      </Definitions>
      {user?.role === 'super_administrator' && (
        <ExportButton
          run={() =>
            reportsService.downloadCsv(
              'applications',
              { created_from: range.from, created_to: range.to },
              `coralswift-applications-${stamp()}.csv`,
            )
          }
        />
      )}
    </>
  )
}

/* ---------------- Enquiries (business) and Strategic / M&A ---------------- */
export function EnquirySection({
  range,
  filters,
  strategic,
  canStrategic,
}: SectionProps & { strategic?: boolean; canStrategic: boolean }) {
  // Strategic is NEVER part of the general scope; it appears only in the Strategic section for authorized users.
  const general: EnquiryType[] = ENQUIRY_TYPES.filter((t) => t !== 'strategic')
  const types: EnquiryType[] = strategic
    ? ['strategic']
    : filters.type !== 'all' && filters.type !== 'strategic'
      ? [filters.type]
      : general
  const scope: EnquiryScope = {
    types,
    status: filters.status === 'all' ? undefined : filters.status,
    range,
  }
  const enabled = !strategic || canStrategic
  const m = useEnquiryMetrics(scope, enabled)
  const rows = useEnquiryRows(scope, enabled)
  const ms = m.data
  const base = strategic ? '/admin/strategic-enquiries' : '/admin/enquiries'
  const statusMs = (ms ?? []).filter((x) => x.key.startsWith('status:'))
  const typeMs = (ms ?? []).filter((x) => x.key.startsWith('type:'))
  const total = get(ms, 'total')
  const exportType = strategic ? 'strategic' : types.length === 1 ? types[0] : undefined
  return (
    <>
      {strategic && <ConfidentialBanner />}
      {strategic && (
        <Note>
          Aggregate counts only. No subjects, contacts or confidential content appear in this
          report.
        </Note>
      )}
      <Grid>
        <MetricCard
          m={total && { ...total, label: strategic ? 'Strategic enquiries' : 'Business enquiries' }}
          icon={Inbox}
          to={base}
        />
        <MetricCard
          m={get(ms, 'overdue')}
          icon={AlertTriangle}
          to="/admin/follow-ups"
          hint="Follow-up date passed, not closed"
        />
        <MetricCard m={get(ms, 'unassigned')} icon={UserX} to={`${base}`} />
        <MetricCard m={get(ms, 'sla')} icon={Clock} to={base} />
      </Grid>
      <Charts>
        <DonutCard title="Enquiries by status" data={metricData(statusMs)} />
        {typeMs.length > 0 && (
          <HBarCard
            title="Project and enquiry distribution"
            description="Enquiry type is the backend's category; IT / Non-IT is not a backend field."
            data={metricData(typeMs)}
          />
        )}
      </Charts>
      <MetricTable title="Status breakdown" metrics={statusMs} total={total?.value} to={base} />
      {typeMs.length > 0 && (
        <MetricTable title="Type breakdown" metrics={typeMs} total={total?.value} to={base} />
      )}
      <RowsGate q={rows}>
        {(f) => (
          <>
            <Charts>
              <LineCard
                title="Enquiries received over time"
                description="By creation day (local time)"
                data={bucketByDay(f.rows, (r) => r.created_at, range)}
              />
              <HBarCard
                title="Loaded enquiries by assignee"
                description="All statuses, loaded records only (user ID shown). Authoritative open-enquiry workload per administrator is on the Lead Assignment page."
                data={groupCount(f.rows, (r) =>
                  r.assigned_user_id ? `User ${shortId(r.assigned_user_id)}` : null,
                )}
              />
            </Charts>
            <Charts>
              <LineCard
                title="Scheduled follow-ups by day"
                description="Open enquiries with a next follow-up date (past days are overdue)"
                data={bucketByDay(
                  f.rows.filter((r) => r.status !== 'closed'),
                  (r) => r.next_follow_up_at,
                  {},
                )}
              />
              <DonutCard
                title="Assigned vs unassigned (loaded)"
                data={[
                  { name: 'Assigned', value: f.rows.filter((r) => r.assigned_user_id).length },
                  { name: 'Unassigned', value: f.rows.filter((r) => !r.assigned_user_id).length },
                ]}
              />
            </Charts>
          </>
        )}
      </RowsGate>
      <Note>
        Unavailable: completed follow-up counts and follow-up activity trends (follow-ups are only
        readable per enquiry; the backend has no aggregate). Overdue uses the backend's own overdue
        filter.
      </Note>
      <Definitions>
        <p>
          <strong>Status</strong> uses the backend enquiry statuses: received, in review, closed.
        </p>
        <p>
          <strong>Overdue follow-ups</strong> = enquiries not closed whose next follow-up date has
          passed (backend filter).
        </p>
        <p>
          <strong>Unassigned</strong> / <strong>SLA breached</strong> = the backend's own filters.
          Totals sum exact backend counts per enquiry type.
        </p>
      </Definitions>
      <ExportButton
        disabledReason={
          !exportType
            ? 'Choose a specific enquiry type to export (an "all types" export is not offered for this role).'
            : undefined
        }
        run={() =>
          reportsService.downloadCsv(
            'enquiries',
            {
              type: exportType,
              status: scope.status,
              created_from: range.from,
              created_to: range.to,
            },
            `coralswift-${strategic ? 'strategic' : 'enquiries'}-${exportType}-${stamp()}.csv`,
          )
        }
      />
    </>
  )
}

/* ---------------- Partner profiles ---------------- */
export function PartnersSection() {
  const counts = usePartnerCounts(true)
  const rows = usePartnerRows(true)
  const ms = counts.data
  return (
    <>
      <Note>
        Partner <em>profiles</em> (organizations) only. The backend has no partner-account endpoint,
        so account status, provisioning and activation metrics are unavailable. The date range does
        not apply (no date filter on the list).
      </Note>
      <Grid>
        <MetricCard m={get(ms, 'total')} icon={Building2} to="/admin/partners" />
        <MetricCard m={get(ms, 'active')} icon={CheckCircle2} to="/admin/partners" />
        <MetricCard m={get(ms, 'suspended')} icon={UserX} to="/admin/partners" />
      </Grid>
      <Charts>
        <DonutCard
          title="Partner profiles by status"
          data={metricData((ms ?? []).filter((x) => x.key !== 'total'))}
        />
      </Charts>
      <MetricTable
        title="Status breakdown"
        metrics={(ms ?? []).filter((x) => x.key !== 'total')}
        total={get(ms, 'total')?.value}
        to="/admin/partners"
      />
      <RowsGate q={rows}>
        {(f) => (
          <HBarCard
            title="Partner profiles by country"
            description="Loaded profiles; missing country grouped as Unknown"
            data={groupCount(f.rows, (r) => r.country, 'Unknown')}
          />
        )}
      </RowsGate>
    </>
  )
}

/* ---------------- Communication (email outbox) ---------------- */
export function CommunicationsSection({ canNewsletter = false }: { canNewsletter?: boolean }) {
  const c = useOutboxCounts(true)
  const ms = c.data
  return (
    <>
      <Note>
        Email outbox status only. “Sent” means the provider accepted the message; the backend gives
        no delivery or read confirmation. “Logged only” was not sent. Date range does not apply.
      </Note>
      <Grid>
        {(ms ?? [undefined, undefined, undefined, undefined]).map((m, i) => (
          <MetricCard key={m?.key ?? i} m={m} icon={Mail} to="/admin/communications/delivery" />
        ))}
      </Grid>
      <Charts>
        <DonutCard title="Outbox by delivery status" data={metricData(ms)} />
      </Charts>
      <MetricTable
        title="Delivery status breakdown"
        metrics={ms}
        total={
          ms?.every((m) => m.value !== undefined) ? ms.reduce((a, m) => a + m.value!, 0) : undefined
        }
        to="/admin/communications/delivery"
      />
      <ExportButton
        label="Export newsletter subscribers (CSV)"
        disabledReason={
          canNewsletter ? undefined : 'Only a Super Administrator may export subscribers.'
        }
        run={() =>
          reportsService.downloadCsv('newsletter', {}, `coralswift-newsletter-${stamp()}.csv`)
        }
      />
    </>
  )
}

/* ---------------- Overview ---------------- */
export function OverviewSection({
  range,
  can,
  canStrategic,
}: {
  range: ResolvedRange
  can: (m: 'applications' | 'enquiries' | 'partners' | 'communications') => boolean
  canStrategic: boolean
}) {
  const apps = useApplicationCounts(can('applications'))
  const general: EnquiryType[] = ENQUIRY_TYPES.filter((t) => t !== 'strategic')
  const enq = useEnquiryMetrics({ types: general, range }, can('enquiries'))
  const strat = useEnquiryMetrics({ types: ['strategic'], range }, canStrategic)
  const orgs = usePartnerCounts(can('partners'))
  const out = useOutboxCounts(can('communications'))
  const kpis = useBackendKpis({ from: range.from, to: range.to }, canStrategic)
  const rename = (m: Metric | undefined, label: string) => m && { ...m, label }
  return (
    <>
      <Note>
        Counts are exact backend totals. Applications, partners and the email outbox are not
        date-filtered by the backend; enquiries respect the selected range.
      </Note>
      <Grid>
        {can('applications') && (
          <MetricCard
            m={rename(get(apps.data, 'total'), 'Partner applications')}
            icon={FileText}
            to="/admin/applications"
          />
        )}
        {can('enquiries') && (
          <MetricCard
            m={rename(get(enq.data, 'total'), 'Business enquiries')}
            icon={Inbox}
            to="/admin/enquiries"
          />
        )}
        {can('enquiries') && (
          <MetricCard m={get(enq.data, 'overdue')} icon={AlertTriangle} to="/admin/follow-ups" />
        )}
        {canStrategic && (
          <MetricCard
            m={rename(get(strat.data, 'total'), 'Strategic / M&A enquiries')}
            icon={Users}
            to="/admin/strategic-enquiries"
          />
        )}
        {can('partners') && (
          <MetricCard
            m={rename(get(orgs.data, 'total'), 'Partner profiles')}
            icon={Building2}
            to="/admin/partners"
          />
        )}
        {can('communications') && (
          <MetricCard
            m={rename(get(out.data, 'failed'), 'Failed emails')}
            icon={Mail}
            to="/admin/communications/delivery"
          />
        )}
      </Grid>
      {canStrategic && (
        <Card>
          <CardHeader>
            <CardTitle>Backend business KPIs</CardTitle>
            <p className="mt-0.5 text-xs text-muted">
              As reported by /admin/reports/kpis for the selected range; shown only to roles that
              can view Strategic / M&A, because the response contents are not documented.
            </p>
          </CardHeader>
          <CardContent>
            {kpis.isPending ? (
              <LoadingState />
            ) : kpis.isError ? (
              <ErrorState message="KPIs unavailable." onRetry={() => void kpis.refetch()} />
            ) : numericEntries(kpis.data).length === 0 ? (
              <p className="text-sm text-muted">The backend returned no numeric KPIs.</p>
            ) : (
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {numericEntries(kpis.data).map((e) => (
                  <div key={e.key}>
                    <dt className="text-xs text-muted">{humanize(e.key)}</dt>
                    <dd className="font-heading text-xl font-bold">{e.value.toLocaleString()}</dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}
