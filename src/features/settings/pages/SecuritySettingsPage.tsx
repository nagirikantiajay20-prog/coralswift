import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { governanceEndpoints } from '@/config/endpoints'
import { api } from '@/services/api/client'
import { toAppError } from '@/services/api/errors'

/** Backend `SecurityPolicyOut` (GET /admin/security-policy, read-only). */
interface SecurityPolicy {
  password_min_length: number
  password_rules: string
  staff_mfa_required: boolean
  partner_mfa: string
  login_max_failures: number
  login_lockout_minutes: number
  access_token_minutes: number
  refresh_token_minutes: number
  invitation_ttl_hours: number
  password_reset_ttl_minutes: number
  rate_limit_per_minute: number
  max_request_body_bytes: number
  max_upload_bytes: number
  max_documents_per_enquiry: number
  allowed_upload_types: string[]
  malware_scanning: string
  invitation_link_path: string
  reset_link_path: string
  captcha_enabled: boolean
}

const mb = (b: number) => `${(b / 1024 / 1024).toFixed(b % 1048576 ? 1 : 0)} MB`
const yn = (v: boolean) => (v ? 'Yes' : 'No')

function Group({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-line py-1">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

/** Read-only: the backend publishes the effective policy but offers no way to change it. */
export default function SecuritySettingsPage() {
  const q = useQuery({
    queryKey: ['settings', 'security-policy'],
    queryFn: async () =>
      (await api.get<{ data: SecurityPolicy | null }>(governanceEndpoints.securityPolicy)).data
        .data,
    retry: false,
  })
  const p = q.data
  return (
    <>
      <PageHeader
        title="Security Settings"
        description="Effective session, password, multi-factor and upload policy as enforced by the backend (read-only)."
      />
      {q.isPending ? (
        <LoadingState label="Loading security policy…" />
      ) : q.isError || !p ? (
        <Card>
          <ErrorState
            message={q.isError ? toAppError(q.error).message : 'The backend returned no policy.'}
            onRetry={() => void q.refetch()}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <Group
            title="Passwords and sign-in"
            rows={[
              ['Minimum password length', String(p.password_min_length)],
              ['Password rules', p.password_rules],
              ['Failed logins before lockout', String(p.login_max_failures)],
              ['Lockout duration', `${p.login_lockout_minutes} min`],
              ['CAPTCHA enabled', yn(p.captcha_enabled)],
            ]}
          />
          <Group
            title="Multi-factor and sessions"
            rows={[
              ['Staff MFA required', yn(p.staff_mfa_required)],
              ['Partner MFA', p.partner_mfa],
              ['Access token lifetime', `${p.access_token_minutes} min`],
              ['Refresh token lifetime', `${p.refresh_token_minutes} min`],
              ['Invitation link lifetime', `${p.invitation_ttl_hours} h`],
              ['Password reset link lifetime', `${p.password_reset_ttl_minutes} min`],
            ]}
          />
          <Group
            title="Limits and uploads"
            rows={[
              ['Requests per minute', String(p.rate_limit_per_minute)],
              ['Max request body', mb(p.max_request_body_bytes)],
              ['Max upload size', mb(p.max_upload_bytes)],
              ['Max documents per enquiry', String(p.max_documents_per_enquiry)],
              ['Allowed upload types', p.allowed_upload_types.join(', ') || '—'],
              ['Malware scanning', p.malware_scanning],
              ['Invitation link path', p.invitation_link_path],
              ['Reset link path', p.reset_link_path],
            ]}
          />
        </div>
      )}
    </>
  )
}
