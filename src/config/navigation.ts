import {
  BarChart3,
  Bell,
  BellRing,
  Briefcase,
  CalendarClock,
  CheckSquare,
  ClipboardCheck,
  FileCheck,
  FileText,
  FolderOpen,
  Globe,
  History,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Rocket,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Tags,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import type { ModuleKey } from './permissions'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  module: ModuleKey
}
export interface NavGroup {
  label?: string
  icon?: LucideIcon
  items: NavItem[]
}

const A = '/admin'

export const NAVIGATION: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', to: `${A}/dashboard`, icon: LayoutDashboard, module: 'dashboard' },
    ],
  },
  {
    label: 'Business Development',
    icon: Briefcase,
    items: [
      {
        label: 'Enquiry Overview',
        to: `${A}/enquiries/overview`,
        icon: Inbox,
        module: 'enquiries',
      },
      { label: 'All Enquiries', to: `${A}/enquiries`, icon: Inbox, module: 'enquiries' },
      {
        label: 'Project Enquiries',
        to: `${A}/enquiries/project`,
        icon: Briefcase,
        module: 'enquiries',
      },
      { label: 'General Enquiries', to: `${A}/enquiries/general`, icon: Mail, module: 'enquiries' },
      {
        label: 'Strategic Overview',
        to: `${A}/strategic-enquiries/overview`,
        icon: ShieldAlert,
        module: 'strategicEnquiries',
      },
      {
        label: 'Strategic / M&A Enquiries',
        to: `${A}/strategic-enquiries`,
        icon: ShieldAlert,
        module: 'strategicEnquiries',
      },
      {
        label: 'Lead Assignment',
        to: `${A}/lead-assignment`,
        icon: UserPlus,
        module: 'leadAssignment',
      },
      { label: 'Discussions', to: `${A}/discussions`, icon: MessageSquare, module: 'discussions' },
      { label: 'Follow-ups', to: `${A}/follow-ups`, icon: CalendarClock, module: 'followUps' },
    ],
  },
  {
    label: 'Partner Management',
    icon: UsersRound,
    items: [
      {
        label: 'Partner Applications',
        to: `${A}/applications`,
        icon: FileText,
        module: 'applications',
      },
      {
        label: 'Application Reviews',
        to: `${A}/application-reviews`,
        icon: ClipboardCheck,
        module: 'applicationReviews',
      },
      { label: 'Document Review', to: `${A}/documents`, icon: FileCheck, module: 'documents' },
      {
        label: 'Approved Applicants',
        to: `${A}/approved-applicants`,
        icon: UserCheck,
        module: 'onboarding',
      },
      { label: 'Onboarding', to: `${A}/onboarding`, icon: Rocket, module: 'onboarding' },
      { label: 'All Partners', to: `${A}/partners`, icon: UsersRound, module: 'partners' },
      {
        label: 'Partner Accounts',
        to: `${A}/partner-accounts`,
        icon: KeyRound,
        module: 'partnerAccounts',
      },
    ],
  },
  {
    label: 'Communication',
    icon: MessageSquare,
    items: [
      {
        label: 'Communications',
        to: `${A}/communications`,
        icon: History,
        module: 'communications',
      },
      { label: 'Notifications', to: `${A}/notifications`, icon: Bell, module: 'notifications' },
      {
        label: 'Delivery Tracking',
        to: `${A}/communications/delivery`,
        icon: Mail,
        module: 'communications',
      },
      {
        label: 'Email Templates',
        to: `${A}/communications/templates`,
        icon: BellRing,
        module: 'communications',
      },
    ],
  },
  {
    label: 'Website Management',
    icon: Globe,
    items: [
      { label: 'Overview', to: `${A}/website`, icon: Globe, module: 'content' },
      { label: 'Website Pages', to: `${A}/website/pages`, icon: FileText, module: 'content' },
      {
        label: 'Content Approval',
        to: `${A}/website/approval`,
        icon: CheckSquare,
        module: 'content',
      },
      { label: 'Public Claims', to: `${A}/website/claims`, icon: Tags, module: 'content' },
    ],
  },
  {
    label: 'Reports & Analytics',
    icon: BarChart3,
    items: [
      { label: 'Overview', to: `${A}/reports`, icon: BarChart3, module: 'reports' },
      {
        label: 'Applications & Onboarding',
        to: `${A}/reports/applications`,
        icon: BarChart3,
        module: 'applications',
      },
      {
        label: 'Business Enquiries',
        to: `${A}/reports/enquiries`,
        icon: BarChart3,
        module: 'enquiries',
      },
      {
        label: 'Strategic / M&A',
        to: `${A}/reports/strategic`,
        icon: BarChart3,
        module: 'strategicEnquiries',
      },
      { label: 'Partners', to: `${A}/reports/partners`, icon: BarChart3, module: 'partners' },
      {
        label: 'Communications',
        to: `${A}/reports/communications`,
        icon: BarChart3,
        module: 'communications',
      },
    ],
  },
  {
    label: 'Administration',
    icon: ShieldCheck,
    items: [
      { label: 'Admin Users', to: `${A}/users`, icon: Users, module: 'users' },
      { label: 'Roles & Permissions', to: `${A}/roles`, icon: ShieldCheck, module: 'roles' },
      { label: 'Audit Logs', to: `${A}/audit-logs`, icon: FolderOpen, module: 'auditLogs' },
      {
        label: 'Privacy & Governance',
        to: `${A}/governance`,
        icon: ShieldCheck,
        module: 'governance',
      },
      {
        label: 'System Settings',
        to: `${A}/system-settings`,
        icon: Settings,
        module: 'settings',
      },
      {
        label: 'Security Settings',
        to: `${A}/system-settings/security`,
        icon: ShieldAlert,
        module: 'settings',
      },
    ],
  },
  {
    label: 'My Account',
    icon: UserCog,
    items: [
      { label: 'Profile', to: `${A}/profile`, icon: UserCog, module: 'account' },
      { label: 'Change Password', to: `${A}/change-password`, icon: KeyRound, module: 'account' },
    ],
  },
]
