import { Bell } from 'lucide-react'
import { EmptyState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/** Shell only: notification list/unread count need the notifications API (spec pending). */
export function NotificationPanel() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80">
        <EmptyState
          title="No notifications"
          description="Notifications will appear here once the notifications API is connected."
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
