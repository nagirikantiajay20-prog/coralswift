import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/states'
import { Card } from '@/components/ui/card'

/** The backend has no security-policy configuration; nothing here is simulated. */
export default function SecuritySettingsPage() {
  return (
    <>
      <PageHeader
        title="Security Settings"
        description="Session, password and multi-factor policy."
      />
      <Card>
        <EmptyState
          title="Not configurable through the API"
          description="The backend exposes no endpoints for session duration, password policy, login lockout, MFA policy or access restrictions. Individual MFA reset is available per administrator under Admin Users. A backend policy API is required before these controls can be built."
          action={
            <Link to="/admin/users" className="text-sm text-coral-ink underline">
              Go to Admin Users
            </Link>
          }
        />
      </Card>
    </>
  )
}
