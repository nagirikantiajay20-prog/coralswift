import {
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Inbox,
  RefreshCw,
  Rocket,
  UsersRound,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { ROUTES } from '@/config/routes'
import { ChartPanel, PendingBackend, QueryBody, RecentCard, type Q } from '../components/widgets'
import { useDashboardData } from '../hooks/useDashboardData'
import { ROW_CAP } from '../services/dashboardService'
import {
  countStatus,
  dailyCounts,
  dayEnd,
  dayStart,
  fmtDate,
  isOpenEnquiry,
  newest,
  numericEntries,
  onboardingProgress,
  STATUS_LABEL,
  statusDistribution,
  upcomingFollowUps,
} from '../utils/transform'

const A = ROUTES.admin
const AXIS = { fontSize: 12, tickLine: false } as const
const PALETTE = [
  '#f05e47',
  '#25294d',
  '#0f9d6b',
  '#f98f33',
  '#6b72a8',
  '#e73b50',
  '#2f7fd1',
  '#8a8fa8',
  '#b4571f',
  '#3c8c8c',
]
const tone = (s: string) => (s === 'rejected' ? 'danger' : s === 'submitted' ? 'warning' : 'info')

function Stat({
  label,
  icon,
  q,
  value,
  hint,
}: {
  label: string
  icon: LucideIcon
  q?: Q
  value?: number
  hint?: string
}) {
  if (!q) return <StatCard label={label} icon={icon} value="Pending backend" hint={hint} />
  if (!q.isEnabled)
    return <StatCard label={label} icon={icon} value="—" hint="Not available for your role" />
  return (
    <StatCard
      label={label}
      icon={icon}
      value={value}
      hint={hint}
      loading={q.isPending}
      error={q.isError}
    />
  )
}

function Counters({ title, q, data }: { title: string; q: Q; data?: Record<string, unknown> }) {
  const rows = numericEntries(data)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <QueryBody q={q} empty={!rows.length}>
          <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 xl:grid-cols-4">
            {rows.map((r) => (
              <div key={r.key} className="bg-white px-5 py-3">
                <dt className="text-xs capitalize text-muted">{r.label}</dt>
                <dd className="font-heading text-xl font-bold">{r.value}</dd>
              </div>
            ))}
          </dl>
        </QueryBody>
      </CardContent>
    </Card>
  )
}

const Th = ({ children }: { children: string }) => (
  <th className="px-5 py-2 text-left text-xs font-medium text-muted">{children}</th>
)

export default function DashboardPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const d = useDashboardData({ from: dayStart(from), to: dayEnd(to) })

  const enquiries = useMemo(() => d.enquiries.data?.rows ?? [], [d.enquiries.data])
  // The applications endpoint has no date filter: the range is applied to the retrieved rows.
  const apps = useMemo(() => {
    const all = d.applications.data?.rows ?? []
    if (!from && !to) return all
    return all.filter((a) => {
      const day = a.submitted_at?.slice(0, 10)
      return !!day && (!from || day >= from) && (!to || day <= to)
    })
  }, [d.applications.data, from, to])

  const submitted = countStatus(apps, 'submitted')
  const onboarding = countStatus(apps, 'pilot_onboarding')
  const followUps = upcomingFollowUps(enquiries)
  const truncated = [
    d.enquiries.data?.partial && 'enquiries',
    d.applications.data?.partial && 'applications',
    d.organizations.data?.partial && 'partners',
  ].filter(Boolean)

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live overview of applications, enquiries and follow-ups."
        actions={
          <Button variant="secondary" onClick={d.refetchAll} disabled={d.refreshing}>
            <RefreshCw className={d.refreshing ? 'size-4 animate-spin' : 'size-4'} aria-hidden />
            Refresh
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="dash-from">From</Label>
          <Input
            id="dash-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="dash-to">To</Label>
          <Input
            id="dash-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        {(from || to) && (
          <Button variant="ghost" onClick={() => (setFrom(''), setTo(''))}>
            Clear dates
          </Button>
        )}
      </div>
      {truncated.length > 0 && (
        <p role="note" className="mb-4 text-xs text-muted">
          Counts for {truncated.join(', ')} are incomplete: only the first {ROW_CAP} records were loaded (safety
          limit), so counts and charts for these lists may be understated.
        </p>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Total partner applications"
          icon={FileText}
          q={d.applications}
          value={apps.length}
          hint="Submitted for review"
        />
        <Stat label="Pending applications" icon={Clock} hint="No 'pending' status in API" />
        <Stat
          label="Approved applications"
          icon={CheckCircle2}
          hint="No 'approved' status in API"
        />
        <Stat
          label="Rejected applications"
          icon={XCircle}
          q={d.applications}
          value={countStatus(apps, 'rejected')}
        />
        <Stat
          label="Active partners"
          icon={UsersRound}
          q={d.organizations}
          value={d.organizations.data?.rows.length}
          hint="Active organizations"
        />
        <Stat
          label="Pending onboarding"
          icon={Rocket}
          q={d.applications}
          value={onboarding}
          hint="Status: pilot onboarding"
        />
        <Stat
          label="Open enquiries"
          icon={Inbox}
          q={d.enquiries}
          value={enquiries.filter(isOpenEnquiry).length}
          hint="Received + in review"
        />
        <Stat
          label="Pending follow-ups"
          icon={CalendarClock}
          q={d.enquiries}
          value={followUps.length}
          hint="Open enquiries with a follow-up date"
        />
      </div>

      <div className="mb-6 grid gap-4">
        <Counters title="Backend overview counters" q={d.overview} data={d.overview.data} />
        {d.access.reports && <Counters title="Business KPIs" q={d.kpis} data={d.kpis.data} />}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <ChartPanel
          title="Partner application trends"
          description="Applications submitted per day"
          q={d.applications}
          empty={!apps.some((a) => a.submitted_at)}
        >
          <ResponsiveContainer>
            <LineChart data={dailyCounts(apps, (a) => a.submitted_at)}>
              <CartesianGrid vertical={false} stroke="#e3e5ee" />
              <XAxis dataKey="day" {...AXIS} />
              <YAxis allowDecimals={false} axisLine={false} {...AXIS} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                name="Applications"
                stroke="#f05e47"
                strokeWidth={2}
                dot
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel
          title="Enquiry trends"
          description="Enquiries received per day"
          q={d.enquiries}
          empty={!enquiries.length}
        >
          <ResponsiveContainer>
            <LineChart data={dailyCounts(enquiries, (e) => e.created_at)}>
              <CartesianGrid vertical={false} stroke="#e3e5ee" />
              <XAxis dataKey="day" {...AXIS} />
              <YAxis allowDecimals={false} axisLine={false} {...AXIS} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                name="Enquiries"
                stroke="#25294d"
                strokeWidth={2}
                dot
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Application status distribution" q={d.applications} empty={!apps.length}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={statusDistribution(apps)}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={85}
              >
                {statusDistribution(apps).map((s, i) => (
                  <Cell key={s.name} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel
          title="Partner onboarding progress"
          description="Applications by pipeline stage"
          q={d.applications}
          empty={!apps.length}
        >
          <ResponsiveContainer>
            <BarChart data={onboardingProgress(apps)} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid horizontal={false} stroke="#e3e5ee" />
              <XAxis type="number" allowDecimals={false} {...AXIS} />
              <YAxis type="category" dataKey="name" width={150} axisLine={false} {...AXIS} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Applications" fill="#f05e47" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <RecentCard
          title="Recent partner applications"
          q={d.applications}
          empty={!apps.length}
          to={`${A}/application-reviews`}
        >
          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>Reference</Th>
                <Th>Organization</Th>
                <Th>Submitted</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {newest(apps, (a) => a.submitted_at).map((a) => (
                <tr key={a.id}>
                  <td className="px-5 py-3 font-medium">{a.reference}</td>
                  <td className="px-5 py-3">{a.organization_name ?? '—'}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted">
                    {fmtDate(a.submitted_at)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge label={STATUS_LABEL[a.status] ?? a.status} tone={tone(a.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </RecentCard>
        <RecentCard
          title="Recent enquiries"
          q={d.enquiries}
          empty={!enquiries.length}
          to={`${A}/enquiries`}
        >
          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>Reference</Th>
                <Th>Name / organization</Th>
                <Th>Type</Th>
                <Th>Received</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {newest(enquiries, (e) => e.created_at).map((e) => (
                <tr key={e.id}>
                  <td className="px-5 py-3 font-medium">
                    <Link to={`${A}/enquiries/${e.id}`} className="text-coral-ink underline">
                      {e.reference_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{e.company_name ?? e.contact_name ?? '—'}</td>
                  <td className="px-5 py-3 capitalize">{e.enquiry_type}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted">
                    {fmtDate(e.created_at)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge
                      label={e.status.replace('_', ' ')}
                      tone={e.status === 'closed' ? 'neutral' : 'info'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </RecentCard>
        <PendingBackend
          title="Recent application decisions"
          reason="The applications list returns no decision timestamp or decision history; the per-application history endpoints are not suitable for a dashboard feed."
        />
        <PendingBackend
          title="Recent onboarding activities"
          reason="No onboarding activity feed or onboarding-task endpoint exists in the backend API."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending actions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-line text-sm">
            <ActionRow
              label="Applications awaiting review (submitted)"
              q={d.applications}
              count={submitted}
              to={`${A}/application-reviews`}
            />
            <ActionRow
              label="Upcoming follow-ups"
              q={d.enquiries}
              count={followUps.length}
              to={`${A}/follow-ups`}
              extra={
                followUps[0] &&
                `Next: ${followUps[0].reference_number}, ${fmtDate(followUps[0].next_follow_up_at)}`
              }
            />
            <ActionRow
              label="Pending onboarding (pilot onboarding)"
              q={d.applications}
              count={onboarding}
              to={`${A}/onboarding`}
            />
            <li className="flex items-center justify-between px-5 py-3">
              <span>Documents awaiting verification</span>
              <span className="text-xs text-muted">
                Pending backend support (no cross-application documents endpoint)
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </>
  )
}

function ActionRow({
  label,
  q,
  count,
  to,
  extra,
}: {
  label: string
  q: Q
  count: number
  to: string
  extra?: string | false
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-5 py-3">
      <span>
        {label}
        {extra && <span className="block text-xs text-muted">{extra}</span>}
      </span>
      {!q.isEnabled ? (
        <span className="text-xs text-muted">Not available for your role</span>
      ) : q.isPending ? (
        <span
          className="h-5 w-8 animate-pulse rounded bg-surface"
          role="status"
          aria-label="Loading"
        />
      ) : q.isError ? (
        <span className="text-xs text-rose">Failed to load</span>
      ) : (
        <Link to={to} className="font-heading font-semibold text-coral-ink underline">
          {count}
        </Link>
      )}
    </li>
  )
}
