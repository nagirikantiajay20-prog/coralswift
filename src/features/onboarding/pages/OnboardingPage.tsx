import { CheckCircle2, FileCheck2, FileClock, Hourglass, Rocket, Users } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Card } from '@/components/ui/card'
import { ApplicationStatusBadge } from '@/features/partner-applications/components/StatusBadgeFor'
import { formatDateTime, humanize } from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import { useApprovedApplicants, useDetails } from '../hooks/useOnboarding'
import { APPROVED_STATUSES } from '../types'
import { summarizeDocs } from '../utils/derive'

/** Document metrics need each application's detail; cap the fan-out to the most recent records. */
const DETAIL_CAP = 100

export default function OnboardingPage() {
  const list = useApprovedApplicants()
  const rows = useMemo(
    () =>
      [...(list.data?.rows ?? [])].sort((a, b) =>
        (b.submitted_at ?? '').localeCompare(a.submitted_at ?? ''),
      ),
    [list.data],
  )
  const sample = rows.slice(0, DETAIL_CAP)
  const details = useDetails(sample.map((r) => r.id))
  const detailsReady = sample.length === 0 || details.every((d) => d.isSuccess)
  const detailsFailed = details.some((d) => d.isError)

  const count = (s: string) => rows.filter((r) => r.status === s).length
  const docs = useMemo(() => {
    const t = { awaiting: 0, needsAction: 0 }
    details.forEach((d) => {
      if (!d.data) return
      const s = summarizeDocs(d.data.documents)
      t.awaiting += s.awaiting
      t.needsAction += s.needsAction
    })
    return t
  }, [details])

  const activity = useMemo(
    () =>
      details
        .flatMap((d) =>
          (d.data?.status_history ?? []).map((h) => ({
            ...h,
            org: d.data!.application.organization_name,
            appId: d.data!.application.id,
          })),
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 8),
    [details],
  )
  const actions = details.filter(
    (d) =>
      d.data &&
      summarizeDocs(d.data.documents).awaiting + summarizeDocs(d.data.documents).needsAction > 0,
  )
  const loading = list.isPending
  const total = rows.length
  const docVal = (n: number) => (detailsReady && !detailsFailed ? n : undefined)
  const capped = rows.length > DETAIL_CAP

  return (
    <>
      <PageHeader
        title="Onboarding"
        description="Progress of approved applicants through onboarding and partner account provisioning."
        actions={
          <Link
            className="text-sm font-medium text-coral-ink underline"
            to="../approved-applicants"
          >
            View approved applicants
          </Link>
        }
      />
      {list.isError ? (
        <Card>
          <ErrorState message={toAppError(list.error).message} onRetry={() => list.refetch()} />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Total approved applicants"
              value={total}
              icon={Users}
              loading={loading}
            />
            <StatCard
              label="Onboarding in progress"
              value={count('pilot_onboarding')}
              icon={Rocket}
              loading={loading}
              hint="Pilot onboarding stage"
            />
            <StatCard
              label="Onboarding completed"
              value={count('scale_up')}
              icon={CheckCircle2}
              loading={loading}
              hint="Scale-up stage"
            />
            <StatCard
              label="Pending documents"
              value={docVal(docs.needsAction)}
              icon={FileClock}
              loading={loading}
              hint="Missing, rejected or clarification needed"
            />
            <StatCard
              label="Documents awaiting verification"
              value={docVal(docs.awaiting)}
              icon={FileCheck2}
              loading={loading}
            />
            <StatCard
              label="Pending account provisioning"
              icon={Hourglass}
              hint="Not available: the backend cannot report invitation or account state"
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            Document counts cover the {Math.min(rows.length, DETAIL_CAP)} most recent applicants
            {capped ? ` (of ${rows.length})` : ''}; the list API carries no document data.
            {detailsFailed && ' Some details failed to load, so document counts are hidden.'}
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="border-b border-line px-5 py-3 text-base font-semibold">
                Status distribution
              </h2>
              <ul className="space-y-3 p-5 text-sm">
                {APPROVED_STATUSES.map((s) => (
                  <li key={s}>
                    <div className="mb-1 flex justify-between">
                      <span>{humanize(s)}</span>
                      <span>{count(s)}</span>
                    </div>
                    <div className="h-2 rounded bg-surface" aria-hidden>
                      <div
                        className="h-2 rounded bg-coral-ink"
                        style={{ width: `${total ? (count(s) / total) * 100 : 0}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <h2 className="border-b border-line px-5 py-3 text-base font-semibold">
                Pending administrative actions
              </h2>
              <div className="p-5">
                {actions.length ? (
                  <ul className="space-y-2 text-sm">
                    {actions.map((d) => {
                      const a = d.data!.application
                      const s = summarizeDocs(d.data!.documents)
                      return (
                        <li key={a.id} className="flex flex-wrap justify-between gap-2">
                          <Link className="underline" to={`../approved-applicants/${a.id}`}>
                            {a.organization_name}
                          </Link>
                          <span className="text-muted">
                            {s.awaiting} to verify · {s.needsAction} need action
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <EmptyState title={detailsReady ? 'No pending document actions' : 'Loading…'} />
                )}
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <h2 className="border-b border-line px-5 py-3 text-base font-semibold">
                Recent onboarding activity
              </h2>
              <div className="p-5">
                {activity.length ? (
                  <ul className="space-y-3 text-sm">
                    {activity.map((h, i) => (
                      <li key={i} className="flex flex-wrap items-center gap-2">
                        <Link
                          className="font-medium underline"
                          to={`../approved-applicants/${h.appId}`}
                        >
                          {h.org}
                        </Link>
                        <ApplicationStatusBadge status={h.to_status} />
                        <span className="text-muted">{formatDateTime(h.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title={detailsReady ? 'No activity yet' : 'Loading…'} />
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  )
}
