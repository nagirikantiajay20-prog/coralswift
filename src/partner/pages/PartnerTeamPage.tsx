import { Users } from 'lucide-react'
import { EmptyState } from '@/components/common/states'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'

/**
 * Phase 33. Backend audit (openapi.json, 2026-11-10): users can share an organization
 * (`InvitationIn.organization_id`), but invitations are super-administrator only
 * (`POST /reviewer/invitations`) and there is no partner-facing team list, detail, invite, resend,
 * cancel, role, activate/deactivate or remove endpoint. `/admin/users*` is staff-only. Nothing is
 * listed, invited or changed here; only the signed-in account from the auth store is shown.
 */
export default function PartnerTeamPage() {
  const partner = useAuthStore((s) => s.partner)
  return (
    <div className="space-y-6">
      <PageHeader title="Team" description="Users in your organization." />
      {partner && (
        <Card>
          <CardHeader>
            <CardTitle>Your account</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd>{partner.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd>{partner.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Organization</dt>
                <dd>{partner.organizationName}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent>
          <EmptyState
            icon={Users}
            title="Team management is not yet available"
            description="Additional users are added by Coral Swift on your behalf; team lists, invitations, roles and access changes are not available in the Partner Portal yet. Contact your Coral Swift representative to add or remove a colleague."
          />
        </CardContent>
      </Card>
    </div>
  )
}
