/**
 * Roles are defined by the PRD (section 14). The role -> module mapping below is a FRONTEND
 * NAVIGATION HINT derived from the PRD role descriptions and the least-privilege principle.
 * It is NOT authorization: the backend must enforce access on every request.
 * `GET /auth/permissions` is consumed at login; this static map is the fallback and mirrors the
 * PRD s.14 role descriptions.
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

/**
 * Representative backend GET route per module. When GET /auth/permissions has loaded, a module is
 * shown only if the backend lists a GET route under this prefix (paths compared without /api/v1).
 * Modules without a distinct route (dashboard, account, strategicEnquiries, discussions,
 * applicationReviews, onboarding) keep the role hint. UX only: the backend authorises every call.
 */
export const MODULE_PROBES: Partial<Record<ModuleKey, string>> = {
  enquiries: '/admin/enquiries',
  leadAssignment: '/admin/workload',
  followUps: '/admin/follow-ups',
  applications: '/reviewer/applications',
  documents: '/admin/documents',
  partners: '/admin/organizations',
  partnerAccounts: '/admin/accounts',
  communications: '/admin/notification-templates',
  notifications: '/admin/feed',
  content: '/admin/content',
  reports: '/admin/reports',
  users: '/admin/users',
  auditLogs: '/admin/audit',
  settings: '/admin/settings',
  governance: '/admin/privacy-requests',
}

const norm = (p: string) => p.replace(/^\/api\/v1/, '')

/** Backend-derived access when permissions are known, otherwise the role hint above. */
export const canAccessWith = (
  role: Role | undefined,
  module: ModuleKey,
  permittedPaths: string[] | null,
): boolean => {
  if (!role) return false
  const probe = MODULE_PROBES[module]
  if (!permittedPaths || !probe) return canAccess(role, module)
  return permittedPaths.some((p) => norm(p).startsWith(probe))
}
