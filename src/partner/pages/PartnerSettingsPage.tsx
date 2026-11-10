import { Bell, LifeBuoy } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { Panel } from '../components/Panel'
import { PARTNER_ROUTES as R } from '../config/routes'

const tabs = [
  { to: R.settings, label: 'Account', end: true },
  { to: R.settingsSecurity, label: 'Security & sessions' },
  { to: R.settingsPrivacy, label: 'Privacy & data' },
]

/** Settings shell: sub-navigation + outlet. Every section is backed by a verified endpoint or says why not. */
export default function PartnerSettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted">Your account, security and privacy.</p>
      </div>
      <nav aria-label="Settings sections" className="flex flex-wrap gap-1 border-b border-line">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                '-mb-px border-b-2 px-3 py-2 text-sm',
                isActive ? 'border-coral-bright font-medium' : 'border-transparent text-navy-soft',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}

/**
 * Account information is read from GET /auth/me (auth store). The backend has no endpoint to edit
 * personal details (PUT /partner/organization is organization-level and lives in Company profile),
 * and no account status, phone or role field, so none is shown or editable.
 */
export function PartnerAccountSection() {
  const p = useAuthStore((s) => s.partner)
  return (
    <div className="space-y-4">
      <Panel title="Account information">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Full name</dt>
            <dd>{p?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Email address</dt>
            <dd>{p?.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Organization</dt>
            <dd>{p?.organizationName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">Account type</dt>
            <dd>Partner</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-muted">
          Personal details cannot be changed here: the backend offers no endpoint for it. To correct
          them, submit a data correction request under{' '}
          <Link className="underline" to={R.settingsPrivacy}>
            Privacy &amp; data
          </Link>
          . Company details are managed in{' '}
          <Link className="underline" to={R.company}>
            Company profile
          </Link>
          . Account activation and status are controlled by Coral Swift and cannot be changed by
          partners.
        </p>
      </Panel>
      <Panel title="Notification preferences">
        <p className="flex items-start gap-2 text-sm text-muted">
          <Bell className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Preferences are not available: the backend has no notification-preference endpoint, so
            no toggles are shown. See the emails sent to you under{' '}
            <Link className="underline" to={R.notifications}>
              Notifications
            </Link>
            .
          </span>
        </p>
      </Panel>
      <Panel title="Account support">
        <p className="flex items-start gap-2 text-sm text-muted">
          <LifeBuoy className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Account access is provisioned by Coral Swift. To deactivate or restrict your account, or
            to add or remove a colleague, contact your Coral Swift representative or submit a
            closure request under Privacy &amp; data.
          </span>
        </p>
      </Panel>
    </div>
  )
}
