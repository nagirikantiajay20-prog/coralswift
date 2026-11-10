/**
 * Partner-facing backend endpoints. VERIFIED in openapi.json (fetched 2026-11-10); all require a
 * partner Bearer token. The organization is taken from the token's membership server-side, never
 * from the request, so no organization id is ever sent. Calls go through the shared `api` client
 * (src/services/api/client.ts); do not create a second client.
 * Not live-tested with a partner account (none available).
 */
const P = '/api/v1/partner'
export const partnerEndpoints = {
  organization: `${P}/organization`, // GET OrganizationOut; PUT ProfileUpdate (partial, recorded in history)
  completion: `${P}/organization/completion`, // GET CompletionOut
  history: `${P}/organization/history`, // GET RevisionOut[]
  changeRequests: `${P}/organization/change-requests`, // GET ChangeRequestOut[]; POST ChangeRequestIn
  applications: `${P}/applications`, // GET own; POST DraftIn
  application: (id: string) => `${P}/applications/${id}`, // GET; PATCH DraftUpdate
  readiness: (id: string) => `${P}/applications/${id}/readiness`,
  submit: (id: string) => `${P}/applications/${id}/submit`, // POST
  resubmit: (id: string) => `${P}/applications/${id}/resubmit`, // POST
  withdraw: (id: string) => `${P}/applications/${id}/withdraw`, // POST WithdrawIn
  applicationHistory: (id: string) => `${P}/applications/${id}/history`, // partner-visible fields only
  messages: (id: string) => `${P}/applications/${id}/messages`, // GET; POST RespondIn
  documents: `${P}/documents`, // GET; POST multipart {file, category, expires_on?} (private, quarantined, no malware scanner)
  document: (id: string) => `${P}/documents/${id}`, // GET; DELETE (soft)
  documentVersions: (id: string) => `${P}/documents/${id}/versions`, // POST multipart
  documentHistory: (id: string) => `${P}/documents/${id}/history`,
  documentDownload: (id: string) => `${P}/documents/${id}/download`, // GET ?version; authorised + audited
  notifications: `${P}/notifications`, // GET page,page_size -> PartnerNotificationOut (template, delivery_status, created_at, read_at, is_read)
  notificationRead: (id: string) => `${P}/notifications/${id}/read`, // POST; own only, others 404
  notificationsReadAll: `${P}/notifications/read-all`, // POST -> { updated count }
  enquiries: `${P}/enquiries`, // GET untyped dict rows
} as const
