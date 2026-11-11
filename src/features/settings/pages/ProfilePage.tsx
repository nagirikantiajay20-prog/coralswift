import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { ROLES } from '@/config/permissions'
import { ProfileEditor } from '@/features/auth/components/ProfileEditor'
import { StaffSecurity } from '@/features/auth/components/StaffSecurity'
import { useAuth } from '@/features/auth/hooks/useAuth'

/** Own profile: name and phone are editable (PATCH /auth/me); email and role are not. */
export default function ProfilePage() {
  const { user } = useAuth()
  if (!user) return null
  const rows = [['Role', ROLES[user.role]]]
  return (
    <>
      <PageHeader title="Profile" />
      <Card className="max-w-lg">
        <CardContent>
          <div className="mb-6">
            <ProfileEditor />
          </div>
          <dl className="space-y-3 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex gap-4">
                <dt className="w-20 text-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <div className="max-w-lg">
        <StaffSecurity />
      </div>
    </>
  )
}
