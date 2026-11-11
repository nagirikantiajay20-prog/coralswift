import { MailX, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/states'
import { Card } from '@/components/ui/card'

function Unavailable({
  title,
  icon,
  missing,
  instead,
}: {
  title: string
  icon: LucideIcon
  missing: string
  instead: [string, string][]
}) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState
          icon={icon}
          title="Not available: the backend does not support this yet"
          description={missing}
          action={
            <ul className="mt-2 space-y-1 text-sm">
              {instead.map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="text-coral-ink hover:underline">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          }
        />
      </Card>
    </>
  )
}

export function EmailsPage() {
  return (
    <Unavailable
      title="Email"
      icon={MailX}
      missing="The API has no endpoint to send an ad-hoc email, so no composer or send button is offered and nothing is simulated. Emails are sent by backend workflows (e.g. partner invitations, information requests)."
      instead={[
        ['Track email delivery', '/admin/communications/delivery'],
        ['Edit email templates', '/admin/communications/templates'],
      ]}
    />
  )
}

export function PreferencesPage() {
  return (
    <Unavailable
      title="Notification preferences"
      icon={SlidersHorizontal}
      missing="The API exposes no notification preferences, so no preference controls are shown."
      instead={[['Communications overview', '/admin/communications']]}
    />
  )
}
