import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState, LoadingState } from '@/components/common/states'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toAppError } from '@/services/api/errors'
import { ProfileSection } from '../components/ProfileSection'
import { PARTNER_ROUTES as R } from '../config/routes'
import { usePartnerProfile } from '../hooks/usePartnerProfile'
import { label, SECTION_KEYS, sectionOf, type SectionKey } from '../utils/profileFields'

export default function PartnerCompanyPage() {
  const p = usePartnerProfile()
  const [focus, setFocus] = useState<SectionKey>()
  const org = p.organization.data
  const pending = p.requests.data?.filter((r) => r.status === 'pending').length ?? 0

  if (p.organization.isLoading) return <LoadingState label="Loading company profile…" />
  if (p.organization.isError || !org) {
    const e = p.organization.isError ? toAppError(p.organization.error) : null
    return (
      <ErrorState
        message={
          e?.status === 403
            ? 'You do not have access to a company profile.'
            : (e?.message ?? 'No company profile is available.')
        }
        onRetry={() => void p.organization.refetch()}
      />
    )
  }
  const c = p.completion.data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company profile"
        description={org.legal_name}
        actions={<StatusBadge label={org.status.replace(/_/g, ' ')} />}
      />

      {pending > 0 && (
        <p role="status" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          {pending} profile change request{pending > 1 ? 's are' : ' is'} awaiting staff review.{' '}
          <Link to={R.profileChanges} className="underline">
            View requests
          </Link>
        </p>
      )}

      <Card aria-label="Profile completion">
        <CardHeader>
          <CardTitle>Profile completion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {p.completion.isError ? (
            <ErrorState
              message="Completion could not be loaded."
              onRetry={() => void p.completion.refetch()}
            />
          ) : !c ? (
            <LoadingState />
          ) : (
            <>
              <div
                role="progressbar"
                aria-label="Profile completion"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={c.percent}
                className="h-2 rounded-full bg-surface"
              >
                <div
                  className="h-2 rounded-full bg-coral-bright"
                  style={{ width: `${Math.min(100, c.percent)}%` }}
                />
              </div>
              <p className="text-sm">{c.percent}% complete</p>
              {c.complete || !c.missing_fields.length ? (
                <p className="text-sm text-muted">No incomplete sections reported.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {c.missing_fields.map((f) => {
                    const s = sectionOf(f)
                    return (
                      <li key={f} className="flex items-center gap-2">
                        Missing: {label(f)}
                        {s && (
                          <Button
                            variant="link"
                            aria-label={`Complete ${label(f)}`}
                            size="sm"
                            onClick={() => {
                              setFocus(s)
                              document.getElementById(`section-${s}`)?.scrollIntoView?.()
                            }}
                          >
                            Complete
                          </Button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {SECTION_KEYS.map((k) => (
        <ProfileSection
          key={`${k}-${focus === k}`}
          section={k}
          org={org}
          focused={focus === k}
          saving={p.save.isPending}
          requesting={p.request.isPending}
          onSave={(changes) => p.save.mutateAsync({ changes, version: org.profile_version })}
          onRequest={(changes, reason) => p.request.mutateAsync({ changes, reason })}
        />
      ))}
    </div>
  )
}
