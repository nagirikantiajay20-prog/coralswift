import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { ROLES } from '@/config/permissions'
import { useAuth } from '@/features/auth/hooks/useAuth'

/** Shows the current session user. Profile editing awaits the backend spec. */
export default function ProfilePage() {
  const { user } = useAuth()
  if (!user) return null
  const rows = [
    ['Name', user.name],
    ['Email', user.email],
    ['Role', ROLES[user.role]],
  ]
  return (
    <>
      <PageHeader title="Profile" />
      <Card className="max-w-lg">
        <CardContent>
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
    </>
  )
}
