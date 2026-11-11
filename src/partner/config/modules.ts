export type PartnerModuleKey =
  | 'dashboard'
  | 'application'
  | 'company'
  | 'documents'
  | 'messages'
  | 'notifications'
  | 'profileChanges'
  | 'account'

interface PartnerModule {
  title: string
  description: string
  capabilities: string[]
}

/** Capabilities are the PRD requirement plus the verified endpoint that will serve it. */
export const PARTNER_MODULES: Record<PartnerModuleKey, PartnerModule> = {
  dashboard: {
    title: 'Dashboard',
    description: 'Application status and company profile completion at a glance.',
    capabilities: [
      'Application status (GET /partner/applications)',
      'Profile completion (GET /partner/organization/completion)',
    ],
  },
  application: {
    title: 'Application',
    description: 'Your partner application and its status history.',
    capabilities: ['Status and partner-visible history', 'Readiness, submit, resubmit, withdraw'],
  },
  company: {
    title: 'Company profile',
    description: 'Your organization profile and completion indicator.',
    capabilities: ['View/update profile (GET/PUT /partner/organization)', 'Revision history'],
  },
  documents: {
    title: 'Documents',
    description: 'Private company documents and additional document requests.',
    capabilities: [
      'Upload, replace with a new version, soft delete',
      'Authorised, audited download',
      'Version history',
    ],
  },
  messages: {
    title: 'Messages',
    description: 'Reviewer messages and information requests.',
    capabilities: [
      'Partner-visible messages (GET /partner/applications/{id}/messages)',
      'Respond to an open information request',
    ],
  },
  notifications: {
    title: 'Notifications',
    description: 'Emails sent to you (type and status only).',
    capabilities: [
      'GET /partner/notifications. The backend has no in-app feed or read/unread state.',
    ],
  },
  profileChanges: {
    title: 'Profile changes',
    description: 'Requests for staff-approved profile changes and the change history.',
    capabilities: ['Submit and list change requests', 'Profile revision history'],
  },
  account: {
    title: 'Account',
    description: 'Your sign-in details and sessions.',
    capabilities: ['Account details (GET /auth/me)', 'Active sessions (GET /auth/sessions)'],
  },
}
