/**
 * Backend endpoint registry. Auth endpoints are VERIFIED against
 * https://coralswift-backend.onrender.com/openapi.json (FastAPI, fetched 2026-11-09).
 * `undefined` = the backend exposes no such endpoint yet (calls fail with NotConfiguredError).
 */
export type Endpoint = string | undefined

const AUTH = '/api/v1/auth'

export const endpoints = {
  auth: {
    login: `${AUTH}/login`,
    refresh: `${AUTH}/refresh`,
    logout: `${AUTH}/logout`,
    me: `${AUTH}/me`,
    mfaEnroll: `${AUTH}/mfa/enroll`,
    mfaConfirm: `${AUTH}/mfa/confirm`,
    mfaVerify: `${AUTH}/mfa/verify`,
    forgotPassword: `${AUTH}/password-reset/request`,
    resetPassword: `${AUTH}/password-reset/confirm`,
    /** POST { current_password, new_password }; other sessions are signed out (live spec 2026-11-10). */
    /** POST { token, password } (partner/staff activate an invited account; no auth). */
    acceptInvitation: `${AUTH}/invitations/accept`,
    changePassword: `${AUTH}/change-password`,
  },
  /** Verified in openapi.json. Lists return { success, message, data: T[], meta }. */
  dashboard: {
    overview: '/api/v1/admin/overview', // untyped dict (response keys not in spec)
    kpis: '/api/v1/admin/reports/kpis', // untyped dict; created_from / created_to
    enquiries: '/api/v1/admin/enquiries', // EnquiryRow[]; page_size<=100, created_from/to
    organizations: '/api/v1/admin/organizations', // OrgRow[]; status=active|suspended
    applications: '/api/v1/reviewer/applications', // ReviewerApplicationOut[]; status=PortalStatus
  },
} as const

/** Verified in openapi.json (fetched 2026-11-09). Reviewer-side application workflow. */
const REVIEW = '/api/v1/reviewer/applications'
export const reviewEndpoints = {
  list: REVIEW, // GET status, unassigned, page, page_size
  detail: (id: string) => `${REVIEW}/${id}`,
  assign: (id: string) => `${REVIEW}/${id}/assign`, // POST { reviewer_id }
  transition: (id: string) => `${REVIEW}/${id}/transition`, // POST { to_status, reason?, partner_note? }
  infoRequests: (id: string) => `${REVIEW}/${id}/information-requests`, // POST { body, requested_categories }
  messages: (id: string) => `${REVIEW}/${id}/messages`,
  notes: (id: string) => `${REVIEW}/${id}/notes`, // GET / POST { body }
  eligibility: (id: string) => `${REVIEW}/${id}/eligibility-verifications`, // POST (human outcome) / GET
  history: (id: string) => `${REVIEW}/${id}/history`, // audit trail
  docReview: (id: string, doc: string) => `${REVIEW}/${id}/documents/${doc}/review`, // POST
  docDownload: (id: string, doc: string) => `${REVIEW}/${id}/documents/${doc}/download`,
  /** POST { email, full_name, organization_id? } -> 201 { organization_id }; super administrator only; 409 on conflict. */
  invitePartner: '/api/v1/reviewer/invitations',
  reviewers: '/api/v1/admin/users', // GET ?role=partner_reviewer (super administrator only)
} as const

/** Verified in openapi.json (fetched 2026-11-09). One enquiry resource; `type` distinguishes general/project/partner/strategic/meeting. */
const ENQ = '/api/v1/admin/enquiries'
export const enquiryEndpoints = {
  list: ENQ, // GET page,page_size,type,status,priority,assigned_user_id,unassigned,overdue,sla_breached,q,created_from,created_to
  detail: (id: string) => `${ENQ}/${id}`, // GET EnquiryDetail; PATCH { status?, priority? }
  assign: (id: string) => `${ENQ}/${id}/assign`, // POST { user_id: string | null }
  followUps: (id: string) => `${ENQ}/${id}/follow-ups`, // POST { note, due_at? } -> 201 FollowUpOut
  completeFollowUp: (id: string, fu: string) => `${ENQ}/${id}/follow-ups/${fu}/complete`, // POST
  download: (id: string, doc: string) => `${ENQ}/${id}/documents/${doc}/download`, // GET blob, audited
  users: '/api/v1/admin/users', // GET ?role= (super administrator only)
  /** type=meeting only. confirm { start, end, calendar_checked: true, note? }; decline/cancel { reason<=4000 }. */
  meeting: (id: string, a: 'confirm' | 'decline' | 'cancel') => `/api/v1/admin/meetings/${id}/${a}`,
} as const

/** Verified in openapi.json (fetched 2026-11-10). A "partner" is the backend `organization`. */
const ORG = '/api/v1/admin/organizations'
export const partnerEndpoints = {
  list: ORG, // GET q(<=100), status=active|suspended, page, page_size<=100 -> OrgRow[]
  detail: (id: string) => `${ORG}/${id}`, // GET untyped dict (profile + applications; financial data super admin only)
  status: (id: string) => `${ORG}/${id}/status`, // POST { status: active|suspended, reason 1..4000 }; super administrator
} as const

/**
 * Verified in openapi.json (fetched 2026-11-10). The backend has NO partner-account list/detail/
 * status/role/invitation-state endpoints. Account provisioning = `reviewEndpoints.invitePartner`;
 * activation = `POST /auth/invitations/accept` (partner-side, token never handled here).
 */
export type AccountAction = 'invitation/resend' | 'invitation/revoke' | 'suspend' | 'reactivate'

export const accountEndpoints = {
  /** GET (super administrator) record_type, action, actor_user_id, organization_id, created_from/to, page, page_size<=100 -> AuditRow[] */
  audit: '/api/v1/admin/audit',
  /** GET q, user_type, status(invited|active|deactivated), invitation, sort, page, page_size -> AccountOut[] */
  accounts: '/api/v1/admin/accounts',
  /** POST /{id}/invitation/resend | invitation/revoke | suspend | reactivate; no body. Backend enforces who may call. */
  accountAction: (id: string, a: AccountAction) => `/api/v1/admin/accounts/${id}/${a}`,
} as const

/**
 * Verified in openapi.json (fetched 2026-11-10). The backend has NO in-app notification feed
 * (no read/unread/archive), NO arbitrary email send, NO preferences and NO communication history.
 * `/admin/notifications` is the email OUTBOX (DeliveryStatus pending|sent|logged|failed); rows are untyped dicts.
 */
const NOTIF = '/api/v1/admin/notifications'
const TPL = '/api/v1/admin/notification-templates'
export const communicationEndpoints = {
  outbox: NOTIF, // GET status (default failed), page, page_size<=100
  dispatch: `${NOTIF}/dispatch`, // POST -> 202 counts; retries eligible emails after the response
  retry: (id: string) => `${NOTIF}/${id}/retry`, // POST -> 200; resets a failed email
  templates: TPL, // GET -> TemplateOut[] (all built-in keys; customised ones include text)
  template: (key: string) => `${TPL}/${encodeURIComponent(key)}`, // PUT TemplateIn / DELETE (revert to built-in)
  preview: (key: string) => `${TPL}/${encodeURIComponent(key)}/preview`, // POST TemplateIn -> dict; sends nothing
} as const

/**
 * Verified in openapi.json (fetched 2026-11-10). The backend CMS is ONE resource, "content"
 * (content_type article|faq|page|resource) with a draft -> in_review -> approved -> published
 * workflow and versions. There are NO media-library, homepage, banner, service, industry, SEO,
 * navigation-menu, scheduling or image endpoints. Bearer on all /admin/*; /content/* is public.
 */
const CONTENT = '/api/v1/admin/content'
export const contentEndpoints = {
  list: CONTENT, // GET status, type, q(<=100), page, page_size<=100 -> AdminContent[]; POST ContentIn -> 201
  detail: (id: string) => `${CONTENT}/${id}`, // GET / PATCH ContentUpdate (draft only)
  versions: (id: string) => `${CONTENT}/${id}/versions`, // GET -> VersionOut[]
  action: (id: string, a: ContentAction) => `${CONTENT}/${id}/${a}`,
  attachment: (id: string) => `${CONTENT}/${id}/attachment`, // POST multipart file, version_label<=40; draft only; 413/415
  claims: '/api/v1/admin/content-claims', // GET status, category, page, page_size / POST ClaimIn
  claim: (id: string) => `/api/v1/admin/content-claims/${id}`, // PATCH ClaimUpdate
  publicList: '/api/v1/content', // public: published only
} as const
export type ContentAction =
  | 'submit' // draft -> in_review
  | 'approve' // in_review -> approved (super administrator) body { note? }
  | 'reject' // in_review -> draft (super administrator) body { note* }
  | 'publish' // approved -> published
  | 'unpublish'
  | 'reopen' // back to draft, removes from site
  | 'archive'

/**
 * Verified in openapi.json (fetched 2026-11-10). Staff administration is super-administrator only
 * (enforced by the backend). There is NO GET-by-id, search, pagination, permission, suspend,
 * profile-update, created-date or per-user activity endpoint. `status` is an untyped string.
 */
const USERS = '/api/v1/admin/users'
export const userEndpoints = {
  list: USERS, // GET ?role=StaffRole -> StaffOut[] (unpaginated); POST StaffInviteIn {email, full_name<=150, role} -> 201 StaffOut; 409 on duplicate
  role: (id: string) => `${USERS}/${id}/role`, // POST { role } -> StaffOut; 409/422
  activate: (id: string) => `${USERS}/${id}/activate`, // POST (no body) -> StaffOut; 409
  deactivate: (id: string) => `${USERS}/${id}/deactivate`, // POST (no body) -> StaffOut; 409
  mfaReset: (id: string) => `${USERS}/${id}/mfa-reset`, // POST (no body) -> 200; lost device; user must re-enroll
} as const

/**
 * Verified in openapi.json (fetched 2026-11-10). Super administrator. The GET response is an untyped
 * dict ("Stored settings and the keys that can be set"); PUT body is `{ value: string 1..200 }`
 * (additional properties forbidden); DELETE removes the stored value. No categories, types or secrets API.
 */
const SETTINGS = '/api/v1/admin/settings'
export const settingsEndpoints = {
  list: SETTINGS,
  item: (key: string) => `${SETTINGS}/${encodeURIComponent(key)}`,
} as const

/**
 * Verified in openapi.json (fetched 2026-11-10; re-verified in Phase 21). Super administrator.
 * Privacy: GET status,page,page_size -> PrivacyRequestOut[]; POST /{id} { status, resolution_note? };
 * POST /{id}/execute (deletion only, anonymises contact data, returns counts).
 * Profile change requests: GET ?status -> AdminChangeRequestOut[]; POST /{id}/decide { approve, note? }.
 * Launch readiness: GET -> untyped dict (PRD s.28 gates).
 */
export const governanceEndpoints = {
  privacy: '/api/v1/admin/privacy-requests',
  privacyItem: (id: string) => `/api/v1/admin/privacy-requests/${id}`,
  privacyExecute: (id: string) => `/api/v1/admin/privacy-requests/${id}/execute`,
  changes: '/api/v1/admin/profile-change-requests',
  decide: (id: string) => `/api/v1/admin/profile-change-requests/${id}/decide`,
  readiness: '/api/v1/admin/launch-readiness',
} as const
