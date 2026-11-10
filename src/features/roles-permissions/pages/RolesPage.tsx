import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Card } from '@/components/ui/card'
import { ROLE_MODULES, ROLES, type Role } from '@/config/permissions'
import { useStaffList } from '@/features/user-management/hooks/useUsers'
import { metrics } from '@/features/user-management/utils/users'

const VERIFIED = [
  'Staff accounts, invitations, role changes, activation, MFA reset and the audit log: Super Administrator only.',
  'Content approval and rejection, partner organisation suspension, privacy requests, application CSV and newsletter exports: Super Administrator only.',
  'Financial data on partner profiles: Super Administrator only.',
]

export default function RolesPage() {
  const counts = metrics(useStaffList().data ?? []).byRole
  return (
    <>
      <PageHeader
        title="Roles & Permissions"
        description="The four backend staff roles. The backend publishes role names only; there is no permission matrix and permissions cannot be edited."
      />
      <Card className="mb-6 p-4">
        <h2 className="mb-2 font-semibold">Verified backend restrictions</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {VERIFIED.map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {(Object.entries(ROLES) as [Role, string][]).map(([key, label]) => {
          const mods = ROLE_MODULES[key]
          return (
            <Card key={key} className="p-4">
              <h2 className="font-semibold">{label}</h2>
              <p className="font-mono text-xs text-muted">{key}</p>
              <p className="mt-2 text-sm">Members: {counts[key] ?? 0}</p>
              <p className="mt-2 text-xs font-medium uppercase text-muted">
                Console navigation (UI hint, not a permission)
              </p>
              <p className="text-sm">{mods === 'all' ? 'All modules' : mods.join(', ')}</p>
            </Card>
          )
        })}
      </div>
      <p className="mt-4 text-sm text-muted">
        Change a person&apos;s role from their profile in{' '}
        <Link to="/admin/users" className="text-coral-ink underline">
          Admin Users
        </Link>
        . Navigation visibility is a convenience; the backend authorises every request.
      </p>
    </>
  )
}
