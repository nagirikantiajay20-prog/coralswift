import { CalendarDays } from 'lucide-react'
import { EmptyState } from '@/components/common/states'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Phase 32. The backend (openapi.json, 2026-11-10) has no partner-facing meeting endpoints: only
 * the public `POST /meetings` (enquiry request) and staff `/admin/meetings/{id}/confirm|decline|
 * cancel`. Nothing is listed, accepted, declined or rescheduled here, and no meeting is invented.
 */
export default function PartnerMeetingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Meetings" description="Meetings arranged with the Coral Swift team." />
      <Card>
        <CardContent>
          <EmptyState
            icon={CalendarDays}
            title="Meeting visibility is not yet available"
            description="Meetings are arranged by your Coral Swift contact and are not shared in the Partner Portal yet. Invitations, changes and notes will be sent to you directly."
          />
        </CardContent>
      </Card>
    </div>
  )
}
