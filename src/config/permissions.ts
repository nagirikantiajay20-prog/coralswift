/**
 * Roles are defined by the PRD (section 14). The role -> module mapping below is a FRONTEND
 * NAVIGATION HINT derived from the PRD role descriptions and the least-privilege principle.
 * It is NOT authorization: the backend must enforce access on every request.
 * The backend exposes role NAMES (StaffRole) but no permission matrix endpoint, so every mapping
 * below is PENDING except those the OpenAPI summaries state as super-administrator-only
 * (users, audit logs, settings-type admin, content approval, application CSV).
 */
export const ROLES = {
  super_administrator: 'Super Administrator',
  business_development_manager: 'Business Development Manager',
  partner_reviewer: 'Partner Reviewer',
  content_administrator: 'Content Administrator',
} as const

export type Role = keyof typeof ROLES

/** Backend `staff_role` values (verified: StaffRole enum) -> frontend role. */
export const STAFF_ROLE_TO_ROLE: Record<string, Role | undefined> = {
  super_administrator: 'super_administrator',
  business_development_manager: 'business_development_manager',
  partner_reviewer: 'partner_reviewer',
  content_administrator: 'content_administrator',
}

export type ModuleKey =
  | 'dashboard'
  | 'enquiries'
  | 'strategicEnquiries'
  | 'leadAssignment'
  | 'discussions'
  | 'followUps'
  | 'applications'
  | 'applicationReviews'
  | 'documents'
  | 'onboarding'
  | 'partners'
  | 'partnerAccounts'
  | 'communications'
  | 'notifications'
  | 'content'
  | 'reports'
  | 'users'
  | 'roles'
  | 'auditLogs'
  | 'settings'
  | 'governance'
  | 'account'

const everyone: ModuleKey[] = ['dashboard', 'account']

export const ROLE_MODULES: Record<Role, ModuleKey[] | 'all'> = {
  super_administrator: 'all',
  business_development_manager: [
    ...everyone,
    'enquiries',
    'leadAssignment',
    'discussions',
    'followUps',
    'communications',
    'notifications',
    'reports',
  ],
  partner_reviewer: [
    ...everyone,
    'applications',
    'applicationReviews',
    'documents',
    'partners',
    'notifications',
  ],
  content_administrator: [...everyone, 'content'],
}

export const canAccess = (role: Role | undefined, module: ModuleKey): boolean => {
  if (!role) return false
  const allowed = ROLE_MODULES[role]
  return allowed === 'all' || allowed.includes(module)
}
