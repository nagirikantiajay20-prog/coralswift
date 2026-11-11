import { Clock, Inbox, Mail, MailCheck, MailWarning, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Card } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { useOutboxTotal } from '../hooks/useCommunication'
import { communicationService } from '../services/communicationService'
import type { DeliveryStatus } from '../types'
import { CAPABILITIES } from '../utils/communication'

const METRICS: { status: DeliveryStatus; label: string; hint: string; icon: typeof Mail }[] = [
  {
    status: 'sent',
    label: 'Emails sent',
    hint: 'Accepted by the provider; not a delivery receipt',
    icon: Send,
  },
  { status: 'failed', label: 'Failed deliveries', hint: 'Can be retried', icon: MailWarning },
  { status: 'pending', label: 'Pending deliveries', hint: 'Awaiting dispatch', icon: Clock },
  { status: 'logged', label: 'Logged only', hint: 'Recorded, not sent to a provider', icon: Inbox },
]

function Metric({ status, label, hint, icon }: (typeof METRICS)[number]) {
  const q = useOutboxTotal(status)
  return (
    <StatCard
      label={label}
      icon={icon}
      loading={q.isPending}
      error={q.isError}
      value={q.data ?? undefined}
      hint={q.data === null ? 'Unavailable: backend sent no total' : hint}
    />
  )
}

function UnreadFeed() {
  const q = useQuery({
    queryKey: ['comms', 'feed', 'unread-count'],
    queryFn: () => communicationService.feed({ unread: true, page: 1, page_size: 1 }),
    retry: false,
  })
  const n = q.data?.meta?.unread
  return (
    <StatCard
      label="Unread admin notifications"
      icon={Inbox}
      loading={q.isPending}
      error={q.isError}
      value={typeof n === 'number' ? n : undefined}
      hint={
        q.data && typeof n !== 'number'
          ? 'Unavailable: backend sent no unread count'
          : 'Your own feed'
      }
    />
  )
}

/** Sum of the four exact per-status totals; unknown if any status total is missing. */
function TotalMetric() {
  const totals = [
    useOutboxTotal('pending'),
    useOutboxTotal('sent'),
    useOutboxTotal('logged'),
    useOutboxTotal('failed'),
  ]
  const loading = totals.some((t) => t.isPending)
  const error = totals.some((t) => t.isError)
  const known = totals.every((t) => typeof t.data === 'number')
  return (
    <StatCard
      label="Total emails (outbox)"
      icon={Mail}
      loading={loading}
      error={error}
      value={known ? totals.reduce((n, t) => n + (t.data ?? 0), 0) : undefined}
      hint="Sum of the four status totals"
    />
  )
}

const LINKS = [
  ['Delivery tracking', '/admin/communications/delivery', 'Outbox by status, retry failed emails'],
  [
    'Email templates',
    '/admin/communications/templates',
    'Override, preview and revert built-in templates',
  ],
  ['Email composer', '/admin/communications/emails', 'Not available: no send endpoint'],
  ['Notification center', '/admin/notifications', 'Your feed: read, archive, mark all read'],
  ['Preferences', '/admin/communications/preferences', 'Not available: no preferences endpoint'],
] as const

export default function CommunicationsPage() {
  return (
    <>
      <PageHeader
        title="Communications"
        description="Email delivery and templates. Only metrics the backend exposes are shown."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <TotalMetric />
        {METRICS.map((m) => (
          <Metric key={m.status} {...m} />
        ))}
        <StatCard
          label="Successfully delivered"
          icon={MailCheck}
          hint="Unavailable: no delivery receipts"
        />
        <UnreadFeed />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {LINKS.map(([title, to, hint]) => (
          <Link key={to} to={to}>
            <Card className="h-full p-4 hover:border-coral-ink">
              <p className="font-medium text-coral-ink">{title}</p>
              <p className="text-sm text-muted">{hint}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="p-4">
        <h2 className="mb-3 font-semibold">
          Backend support (verified against openapi.json, 2026-11-10)
        </h2>
        <ul className="divide-y divide-line text-sm">
          {CAPABILITIES.map((c) => (
            <li key={c.operation} className="flex flex-wrap items-start gap-3 py-2">
              <StatusBadge
                label={c.support === 'verified' ? 'Supported' : 'Not available'}
                tone={c.support === 'verified' ? 'success' : 'warning'}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.operation}</p>
                <p className="text-muted">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
