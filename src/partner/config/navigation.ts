import {
  Bell,
  Building2,
  ClipboardList,
  FileText,
  History,
  Inbox,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Send,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { PARTNER_ROUTES as R } from './routes'

export interface PartnerNavItem {
  label: string
  to: string
  icon: LucideIcon
}

/** Projects, Performance, Meetings and Team are routed but hidden: PRD s.23 / s.15D / s.15I, or not in the PRD. */
/** Each item maps to a PRD Partner Portal requirement and a verified /api/v1/partner endpoint. */
export const PARTNER_NAVIGATION: PartnerNavItem[] = [
  { label: 'Dashboard', to: R.dashboard, icon: LayoutDashboard },
  { label: 'Application', to: R.application, icon: Send },
  { label: 'Onboarding', to: R.onboarding, icon: ClipboardList },
  { label: 'Company profile', to: R.company, icon: Building2 },
  { label: 'Documents', to: R.documents, icon: FileText },
  { label: 'Messages', to: R.messages, icon: MessageSquare },
  { label: 'Follow-ups', to: R.followUps, icon: ListChecks },
  { label: 'Notifications', to: R.notifications, icon: Bell },
  { label: 'Enquiries', to: R.enquiries, icon: Inbox },
  { label: 'Profile changes', to: R.profileChanges, icon: History },
  { label: 'Settings', to: R.settings, icon: Settings },
]
