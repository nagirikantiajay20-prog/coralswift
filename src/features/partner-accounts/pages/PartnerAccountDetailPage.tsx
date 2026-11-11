import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ProvisioningPanel } from '@/features/onboarding/components/ProvisioningPanel'
import { useApplicationDetail } from '@/features/partner-applications/hooks/useApplications'
import { Fields, Section } from '@/features/partner-applications/pages/ApplicationDetailPage'
import { formatDateTime, humanize, shortId } from '@/features/partner-applications/utils/format'
import { usePartnerDetail } from '@/features/partner-management/hooks/usePartners'
import { STATUS_TONE } from '@/features/partner-management/utils/partners'
import { toAppError } from '@/services/api/errors'
import { useAccountDetail, useAccountEvents, useOrgAccounts } from '../hooks/useAccounts'
import { onboardingApplications } from '../utils/accounts'

/** Reuses the Phase 7 ProvisioningPanel (blockers, confirmation, 409 surfaced) on the onboarding application. */
function Provisioning({ appId }: { appId: string }) {
  const q = useApplicationDetail(appId)
  if (q.isPending) return <LoadingState label="Loading onboarding record…" />
  if (q.isError)
    return <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
  if (!q.data) return <ErrorState message="The onboarding record could not be read." />
  return <ProvisioningPanel detail={q.data} />
}

function Activity({ orgId, enabled }: { orgId: string; enabled: boolean }) {
  const q = useAccountEvents(orgId, enabled)
  if (!enabled)
    return (
      <p className="text-sm text-muted">
        The audit trail is available to Super Administrators only.
      </p>
    )
  if (q.isPending) return <LoadingState label="Loading activity…" />
  if (q.isError) {
    const e = toAppError(q.error)
    return (
      <ErrorState
        message={
          e.status === 403 ? 'You do not have permission to view the audit trail.' : e.message
        }
      />
    )
  }
  if (q.data.length === 0) return <EmptyState title="No audit events returned for this partner" />
  return (
    <ul className="divide-y divide-line text-sm">
      {q.data.map((ev) => (
        <li key={ev.id} className="flex flex-wrap justify-between gap-2 py-2">
          <span>
            <b>{humanize(ev.action.replace(/[.:]/g, '_'))}</b> · {humanize(ev.recordType)} ·{' '}
            {ev.actorType}
            {ev.actorUserId ? ` ${shortId(ev.actorUserId)}` : ''}
          </span>
          <time className="text-muted">{formatDateTime(ev.at)}</time>
        </li>
      ))}
    </ul>
  )
}

function Holder({ userId }: { userId: string }) {
  const q = useAccountDetail(userId)
  if (q.isPending) return <LoadingState label="Loading account…" />
  if (q.isError)
    return <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
  const a = q.data
  return (
    <div className="space-y-2">
      <Fields
        items={[
          ['Account holder', a.full_name],
          ['Email', a.email],
          ['Account status', humanize(a.status)],
          ['Invitation', humanize(a.invitation_state)],
          ['Invitation email', a.invitation_delivery_status ? humanize(a.invitation_delivery_status) : null],
          ['MFA', a.mfa_enabled ? 'Enabled' : 'Not enabled'],
          ['Last login', a.last_login_at ? formatDateTime(a.last_login_at) : 'Never'],
        ]}
      />
      {a.recent_activity.length > 0 && (
        <ul className="divide-y divide-line text-sm">
          {a.recent_activity.map((ev, i) => (
            <li key={i} className="flex flex-wrap justify-between gap-2 py-1">
              <span>
                {humanize(ev.action.replace(/[.:]/g, '_'))}
                {ev.actor_name ? ` · ${ev.actor_name}` : ''}
              </span>
              <time className="text-muted">{formatDateTime(ev.created_at)}</time>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Account holders of this organization (GET /admin/accounts, GET /admin/accounts/{user_id}); super administrator only. */
function AccountHolders({ orgId, enabled }: { orgId: string; enabled: boolean }) {
  const q = useOrgAccounts(orgId, enabled)
  if (!enabled)
    return <p className="text-sm text-muted">Account details are available to Super Administrators only.</p>
  if (q.isPending) return <LoadingState label="Loading accounts…" />
  if (q.isError)
    return <ErrorState message={toAppError(q.error).message} onRetry={() => void q.refetch()} />
  return (
    <div className="space-y-4">
      {q.data.partial && (
        <p role="note" className="text-xs text-amber-900">
          Not every partner account could be searched (safety limit); accounts may be missing here.
        </p>
      )}
      {q.data.rows.length === 0 ? (
        <EmptyState title="No account has been created for this partner yet" />
      ) : (
        q.data.rows.map((a) => <Holder key={a.id} userId={a.id} />)
      )}
    </div>
  )
}

export default function PartnerAccountDetailPage() {
  const { id = '' } = useParams()
  const { user, can } = useAuth()
  const q = usePartnerDetail(id)

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

  const { org, applications } = q.data
  const candidates = onboardingApplications(applications)
  const isSuper = user?.role === 'super_administrator'
  const status = org.status ?? ''

  return (
    <>
      <PageHeader
        title={`Access: ${org.legal_name ?? 'Partner'}`}
        description={`Partner ${shortId(org.id)} — a partner organization record, not an account`}
        actions={
          status ? (
            <StatusBadge label={humanize(status)} tone={STATUS_TONE[status] ?? 'neutral'} />
          ) : undefined
        }
      />
      <div className="space-y-4">
        <Section title="Account overview">
          <Fields
            items={[
              [
                'Linked partner',
                can('partners') ? (
                  <Link
                    key="p"
                    className="text-coral-ink hover:underline"
                    to={`/admin/partners/${org.id}`}
                  >
                    {org.legal_name ?? shortId(org.id)}
                  </Link>
                ) : (
                  (org.legal_name ?? null)
                ),
              ],
              ['Partnership status', status ? humanize(status) : null],
              ['Roles and permissions', 'Not defined for partners in the backend'],
            ]}
          />
        </Section>

        <Section title="Account holders">
          <AccountHolders orgId={id} enabled={isSuper} />
        </Section>

        <Section title="Related records">
          {applications.length === 0 ? (
            <EmptyState title="No applications returned for this partner" />
          ) : (
            <ul className="divide-y divide-line text-sm">
              {applications.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {a.reference ?? shortId(a.id)} · {a.status ? humanize(a.status) : '—'}
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
                    {can('onboarding') && onboardingApplications([a]).length > 0 && (
                      <Link
                        className="text-coral-ink hover:underline"
                        to={`/admin/approved-applicants/${a.id}`}
                      >
                        Onboarding
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Provisioning">
          {!isSuper ? (
            <p className="text-sm text-muted">
              Only a Super Administrator can provision partner access.
            </p>
          ) : status === 'suspended' ? (
            <p className="text-sm text-amber-900" role="status">
              Partnership is suspended; reactivate it in Partners before provisioning.
            </p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-amber-900" role="status">
              No application has reached the onboarding stage (pilot_onboarding / scale_up).
              Provisioning is not offered; approval alone never creates an account.
            </p>
          ) : (
            <Provisioning appId={candidates[0].id} />
          )}
          <p className="mt-3 text-xs text-muted">
            Existing accounts and invitations are listed under Account holders; duplicate prevention
            is the backend&apos;s (a 409 is shown verbatim).
          </p>
        </Section>

        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Activity history</h2>
          <p className="mb-2 text-xs text-muted">
            Organization-scoped audit events as returned by the backend; no entries are inferred.
          </p>
          <Activity orgId={id} enabled={isSuper} />
        </Card>
      </div>
    </>
  )
}
