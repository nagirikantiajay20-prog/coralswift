import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  Fields,
  Records,
  Section,
} from '@/features/partner-applications/pages/ApplicationDetailPage'
import { FormDialog } from '@/features/partner-applications/components/ReviewActions'
import {
  formatDate,
  formatDateTime,
  humanize,
  shortId,
} from '@/features/partner-applications/utils/format'
import { toAppError } from '@/services/api/errors'
import {
  usePartnerActivity,
  usePartnerDetail,
  usePartnerRevisions,
  useSetPartnerStatus,
} from '../hooks/usePartners'
import { statusChangeSchema, type StatusChangeForm } from '../schemas'
import type { PartnerDetail } from '../types'
import { lifecycle, STATUS_TONE, statusAction } from '../utils/partners'

const TABS = ['Overview', 'Business', 'Partnership', 'Onboarding & records'] as const
const textarea =
  'min-h-24 w-full rounded-md border border-line bg-white p-3 text-sm aria-[invalid=true]:border-rose'

function StatusDialog({
  id,
  to,
  label,
  onClose,
}: {
  id: string
  to: 'active' | 'suspended'
  label: string
  onClose: () => void
}) {
  const f = useForm<StatusChangeForm>({
    resolver: zodResolver(statusChangeSchema),
    defaultValues: { reason: '' },
  })
  const m = useSetPartnerStatus(id, onClose)
  return (
    <FormDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={label}
      description={
        to === 'suspended'
          ? 'Suspending changes the partnership status. The reason is recorded by the backend.'
          : 'Reactivating restores the active partnership status. The reason is recorded by the backend.'
      }
      formId="partner-status-form"
      submitLabel={label}
      busy={m.isPending}
    >
      <form
        id="partner-status-form"
        onSubmit={f.handleSubmit((v) => m.mutate({ status: to, reason: v.reason }))}
      >
        <FormField label="Reason" error={f.formState.errors.reason?.message}>
          <textarea className={textarea} {...f.register('reason')} />
        </FormField>
      </form>
    </FormDialog>
  )
}

const short = (v: unknown) => {
  const t = typeof v === 'string' ? v : JSON.stringify(v)
  return t.length > 120 ? `${t.slice(0, 120)}…` : t
}

/** Profile revisions and audit trail for one organisation; each part fails independently. */
function History({ id }: { id: string }) {
  const rev = usePartnerRevisions(id)
  const act = usePartnerActivity(id)
  const state = (q: { isPending: boolean; isError: boolean; error: unknown; data?: unknown[] }) =>
    q.isPending ? (
      <LoadingState label="Loading…" />
    ) : q.isError ? (
      <p role="alert" className="text-sm text-rose-800">
        {toAppError(q.error).status === 403
          ? 'You do not have permission to view this.'
          : toAppError(q.error).message}
      </p>
    ) : !q.data?.length ? (
      <EmptyState title="Nothing recorded yet" />
    ) : null
  return (
    <>
      <Section title="Profile revisions">
        {state(rev) ?? (
          <ul className="divide-y divide-line text-sm">
            {rev.data?.map((r) => (
              <li key={r.version} className="space-y-1 py-2">
                <p>
                  <b>Version {r.version}</b> · {r.changed_by_name ?? shortId(r.changed_by)} ·{' '}
                  {formatDateTime(r.created_at)}
                </p>
                <ul className="text-muted">
                  {Object.entries(r.changes).map(([k, v]) => (
                    <li key={k}>
                      {humanize(k)}: {short(v)}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Activity">
        {state(act) ?? (
          <ul className="divide-y divide-line text-sm">
            {act.data?.map((a) => (
              <li key={a.id} className="py-2">
                {humanize(a.action)} · {humanize(a.record_type)} · {a.actor_name ?? 'System'} ·{' '}
                {formatDateTime(a.created_at)}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  )
}

function Profile({ d, tab }: { d: PartnerDetail; tab: (typeof TABS)[number] }) {
  const { can } = useAuth()
  const o = d.org
  if (tab === 'Overview')
    return (
      <Section title="Organization">
        <Fields
          items={[
            ['Legal name', o.legal_name ?? null],
            ['Partner reference', shortId(o.id)],
            ['Partnership status', o.status ? humanize(o.status) : null],
            ['Country', o.country ?? null],
            ['Registered address', o.registered_address ?? null],
            ['Website', o.website ?? null],
            ['Registration number', o.registration_number ?? null],
            ['Contacts', <Records key="c" rows={o.authorized_contacts ?? null} />],
          ]}
        />
      </Section>
    )
  if (tab === 'Business')
    return (
      <Section title="Business information">
        <Fields
          items={[
            ['Description', o.business_description ?? null],
            ['Service categories', o.service_categories?.map(humanize).join(', ') ?? null],
            ['Technical capabilities', o.technical_capabilities ?? null],
            ['Infrastructure', o.infrastructure_summary ?? null],
            ['Year established', o.year_established ?? null],
            ['Employees', o.employee_count ?? null],
            // Backend returns turnover to super administrators only; absent = not authorised or not provided.
            ['Annual turnover (INR crore)', o.annual_turnover_inr_crore ?? null],
            ['Client references', <Records key="r" rows={o.client_references ?? null} />],
          ]}
        />
      </Section>
    )
  if (tab === 'Partnership')
    return (
      <Section title="Applications">
        {d.applications.length === 0 ? (
          <EmptyState title="No applications returned for this partner" />
        ) : (
          <ul className="divide-y divide-line">
            {d.applications.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <span>
                  {a.reference ?? shortId(a.id)} · {a.status ? humanize(a.status) : '—'} · submitted{' '}
                  {formatDate(a.submitted_at)}
                </span>
                <span className="flex gap-3">
                  {can('applications') && (
                    <Link
                      className="text-coral-ink hover:underline"
                      to={`/admin/applications/${a.id}`}
                    >
                      Application
                    </Link>
                  )}
                  {can('applicationReviews') && (
                    <Link
                      className="text-coral-ink hover:underline"
                      to={`/admin/application-reviews/${a.id}`}
                    >
                      Review
                    </Link>
                  )}
                  {can('documents') && (
                    <Link
                      className="text-coral-ink hover:underline"
                      to={`/admin/documents/${a.id}`}
                    >
                      Documents
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    )
  return (
    <>
      <Section title="Onboarding and accounts">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>
            Onboarding is tracked per application (stage <b>pilot_onboarding</b> / <b>scale_up</b>)
            in Onboarding; it does not imply account activation.
          </li>
          <li>
            Partner account provisioning/activation state is not exposed by the organization
            endpoints.
          </li>
          <li>
            Agreements, relationship manager and performance data are not provided by the backend.
          </li>
          <li>Documents belong to applications: open them from the Partnership tab.</li>
        </ul>
      </Section>
      <History id={o.id} />
    </>
  )
}

export default function PartnerDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const q = usePartnerDetail(id)
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview')
  const [dialog, setDialog] = useState(false)

  if (q.isPending) return <LoadingState label="Loading partner…" />
  if (q.isError) {
    const e = toAppError(q.error)
    const message =
      e.status === 403
        ? 'You do not have permission to view this partner.'
        : e.status === 404
          ? 'Partner not found.'
          : e.message
    return (
      <ErrorState
        message={message}
        onRetry={e.status === 403 || e.status === 404 ? undefined : () => void q.refetch()}
      />
    )
  }
  if (!q.data) return <ErrorState message="The backend returned an unrecognised partner record." />

  const d = q.data
  const status = d.org.status ?? ''
  const action = statusAction(status)
  const lc = lifecycle({ status, open_application_status: null })
  // Backend: status change is super-administrator only.
  const canChange = user?.role === 'super_administrator' && !!action

  return (
    <>
      <PageHeader
        title={d.org.legal_name ?? 'Partner'}
        description={`Partner ${shortId(d.org.id)}`}
        actions={
          <>
            {status && (
              <StatusBadge label={humanize(status)} tone={STATUS_TONE[status] ?? 'neutral'} />
            )}
            {canChange && (
              <Button
                variant={action.to === 'suspended' ? 'danger' : 'primary'}
                onClick={() => setDialog(true)}
              >
                {action.label}
              </Button>
            )}
          </>
        }
      />
      <p className="mb-4 text-xs text-muted">
        Partnership: {humanize(lc.partnership || 'unknown')} · Account state: {lc.accountState}
      </p>
      <div role="tablist" className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t}
            role="tab"
            aria-selected={tab === t}
            variant={tab === t ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setTab(t)}
          >
            {t}
          </Button>
        ))}
      </div>
      <Profile d={d} tab={tab} />
      {dialog && action && (
        <StatusDialog
          id={id}
          to={action.to}
          label={action.label}
          onClose={() => setDialog(false)}
        />
      )}
    </>
  )
}
