# API contract matrix

Source of truth: `https://coralswift-backend.onrender.com/openapi.json` fetched 2026-11-11 (162 paths, 291 schemas, 183 operations). Generated from the code by static analysis (`docs/` regenerate script lives outside the repo); it did not run the application.

**Vocabulary.** *Registered* = the path is in `src/config/endpoints.ts` or `src/partner/config/endpoints.ts`. *Integrated* = a service function calls it and a page or component consumes it. *Unit (heuristic)* = a test in the same feature mentions the endpoint key or path; these are mock-based and do not prove backend behaviour. *Live-verified* = exercised against a real backend with an authorized account. **None were live-verified in this audit.** "Prior shape-probe" means `scripts/probe-live.mjs` was run by an earlier developer per the docs.

Totals: Integrated 157, Registered only 0, Not used 5, Out of scope 21.

## auth

| Endpoint | Method | Backend purpose | Frontend service | Consuming module | Auth | Status | Unit tests | Live-verified |
|---|---|---|---|---|---|---|---|---|
| `/api/v1/auth/login` | POST | Sign in (partner or staff) | auth/services/authService.ts | - | Public | Integrated | No | Prior shape-probe, not re-run |
| `/api/v1/auth/refresh` | POST | Rotate tokens (the old refresh token stops working; reuse revokes the session) | auth/services/authService.ts | - | Public | Integrated | Unit (heuristic) | No |
| `/api/v1/auth/logout` | POST | Revoke this session | auth/services/authService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/auth/invitations/accept` | POST | Activate an invited account and set the password | auth/services/authService.ts | - | Public | Integrated | No | No |
| `/api/v1/auth/password-reset/request` | POST | Request a password reset email (always answers the same way) | auth/services/authService.ts, partner/services/partnerSettingsService.ts | - | Public | Integrated | No | No |
| `/api/v1/auth/password-reset/confirm` | POST | Set a new password with a single-use token; revokes all sessions | auth/services/authService.ts | - | Public | Integrated | No | No |
| `/api/v1/auth/change-password` | POST | Change your own password (staff and partners); your other sessions are signed out | auth/services/authService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/auth/permissions` | GET | Endpoints this account may call, derived from the live route guards | - | - | Bearer | Not used | - | Prior shape-probe, not re-run |
| `/api/v1/auth/me` | GET | Current account | auth/services/authService.ts, partner/services/partnerAuthService.ts | auth/components/ProfileEditor.tsx | Bearer | Integrated | Unit (heuristic) | Prior shape-probe, not re-run |
| `/api/v1/auth/me` | PATCH | Update your own name and phone (staff and partners); audited | auth/services/authService.ts, partner/services/partnerAuthService.ts | auth/components/ProfileEditor.tsx | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/auth/mfa/disable` | POST | Turn MFA off (partner accounts only; password and a current code required) | partner/services/partnerSettingsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/auth/sessions` | GET | List Sessions | partner/services/partnerSettingsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/auth/sessions` | DELETE | Sign out every other session of your account | partner/services/partnerSettingsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/auth/sessions/{session_id}` | DELETE | Revoke one of your own sessions | partner/services/partnerSettingsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/auth/mfa/enroll` | POST | Start TOTP enrollment (works before MFA is verified; staff must enroll) | auth/services/authService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/auth/mfa/confirm` | POST | Confirm enrollment with the first code; returns recovery codes once | auth/services/authService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/auth/mfa/verify` | POST | Complete sign-in with a TOTP code or a one-time recovery code | auth/services/authService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/auth/mfa/recovery-codes` | POST | Replace recovery codes (needs a current authenticator code); old codes stop working | partner/services/partnerSettingsService.ts | - | Bearer | Integrated | No | No |

## staff

| Endpoint | Method | Backend purpose | Frontend service | Consuming module | Auth | Status | Unit tests | Live-verified |
|---|---|---|---|---|---|---|---|---|
| `/api/v1/admin/overview` | GET | Dashboard counters (scoped to your role) | dashboard/services/dashboardService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/workload` | GET | Open enquiry workload counts by assignee (no capacity limits) | lead-assignment/services/leadAssignmentService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/enquiries` | GET | Enquiries / leads (filters, search, pagination) | dashboard/services/dashboardService.ts, business-enquiries/services/businessEnquiriesService.ts | - | Bearer | Integrated | Unit (heuristic) | Prior shape-probe, not re-run |
| `/api/v1/admin/enquiries/{enquiry_id}` | GET | Enquiry Detail | business-enquiries/services/businessEnquiriesService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/enquiries/{enquiry_id}` | PATCH | Change status or priority | business-enquiries/services/businessEnquiriesService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/enquiries/{enquiry_id}/documents` | GET | List enquiry attachments (financial attachments are super-admin only) | - | business-enquiries/components/EnquiryDocuments.tsx | Bearer | Integrated | No | No |
| `/api/v1/admin/enquiries/{enquiry_id}/assign` | POST | Assign or clear the lead owner | business-enquiries/services/businessEnquiriesService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/enquiries/{enquiry_id}/follow-ups` | POST | Add a follow-up / communication note | business-enquiries/services/businessEnquiriesService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/enquiries/{enquiry_id}/follow-ups/{followup_id}/complete` | POST | Complete Followup | business-enquiries/services/businessEnquiriesService.ts | follow-ups/components/AllFollowUps.tsx | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/enquiries/{enquiry_id}/documents/{document_id}/download` | GET | Download an enquiry attachment (audited) | business-enquiries/services/businessEnquiriesService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/organizations` | GET | Partner organizations | dashboard/services/dashboardService.ts, partner-management/services/partnerManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/organizations/{org_id}` | GET | Organization profile + applications (financial data: super administrators only) | partner-management/services/partnerManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/organizations/{org_id}/status` | POST | Suspend or reactivate an organization (super administrator) | partner-management/services/partnerManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/users` | GET | Staff accounts (super administrator) | user-management/services/userManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/users` | POST | Invite a staff user (they set a password, then enroll MFA) | user-management/services/userManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/users/{user_id}/role` | POST | Change Role | user-management/services/userManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/users/{user_id}/deactivate` | POST | Deactivate | user-management/services/userManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/users/{user_id}/activate` | POST | Activate | user-management/services/userManagementService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/audit` | GET | Audit log (super administrator) | audit-logs/services/auditLogsService.ts, partner-accounts/services/partnerAccountsService.ts, user-management/services/userManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/audit/actions` | GET | List event actions currently present in the audit log | audit-logs/services/auditLogsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/audit/{activity_id}` | GET | Get one audit event by id (super administrator) | - | - | Bearer | Not used | - | No |
| `/api/v1/admin/audit.csv` | GET | Export the filtered audit log as formula-safe CSV (super administrator) | audit-logs/services/auditLogsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/reports/enquiries.csv` | GET | CSV export of the enquiry list (same filters; capped at 10,000 rows; audited) | reports/services/reportsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/reports/applications.csv` | GET | CSV export of partner applications (super administrator) | reports/services/reportsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/settings` | GET | Stored settings and the keys that can be set | settings/services/settingsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/settings/{key}` | PUT | Put Setting | settings/services/settingsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/settings/{key}` | DELETE | Delete Setting | settings/services/settingsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/notification-templates` | GET | All template keys; customised ones include their text | communication/services/communicationService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/notification-templates/placeholders` | GET | List placeholders accepted by notification templates | communication/services/communicationService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/notification-templates/{key}` | PUT | Override a built-in email template (allowed placeholders only) | communication/services/communicationService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/notification-templates/{key}` | DELETE | Revert to the built-in template | communication/services/communicationService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/notification-templates/{key}/preview` | POST | Render a template with sample values (no email is sent) | communication/services/communicationService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/users/{user_id}/mfa-reset` | POST | Clear a staff member's MFA after a lost device (they must re-enroll) | user-management/services/userManagementService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/reports/kpis` | GET | Business KPIs (PRD s.20). No targets: the PRD asks for a baseline first | dashboard/services/dashboardService.ts | reports/components/BackendReports.tsx | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/reports/follow-ups` | GET | Follow-up counts by kind and open/completed/cancelled state | - | reports/components/BackendReports.tsx | Bearer | Integrated | No | No |
| `/api/v1/admin/reports/document-review` | GET | Partner document version review counts and observed average turnaround | - | reports/components/BackendReports.tsx | Bearer | Integrated | No | No |
| `/api/v1/admin/reports/communications` | GET | Email outbox counts by delivery status and template | - | reports/components/BackendReports.tsx | Bearer | Integrated | No | No |
| `/api/v1/admin/notifications` | GET | Outbox rows (default: failed) with filters and sorting | communication/services/communicationService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/notifications/dispatch` | POST | Retry eligible emails now (runs after the response; rows past the cap need /retry) | communication/services/communicationService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/notifications/{notification_id}/retry` | POST | Reset a failed email so it will be attempted again | communication/services/communicationService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/launch-readiness` | GET | PRD s.28 launch gates: contact details and queue configuration | governance/service.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/organizations/{org_id}/revisions` | GET | Profile revisions of an organisation with before/after values and who changed them | partner-management/services/partnerManagementService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/organizations/{org_id}/activity` | GET | Audit trail of one organisation (strategic enquiry events are never included) | partner-management/services/partnerManagementService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/follow-ups` | GET | Follow-ups and communications across visible enquiries (counts in meta) | - | follow-ups/components/AllFollowUps.tsx | Bearer | Integrated | No | Prior shape-probe, not re-run |
| `/api/v1/admin/enquiries/{enquiry_id}/follow-ups/{followup_id}` | PATCH | Edit, reschedule or reassign an open follow-up (null clears due date or assignee) | - | follow-ups/components/AllFollowUps.tsx | Bearer | Integrated | No | No |
| `/api/v1/admin/enquiries/{enquiry_id}/follow-ups/{followup_id}/cancel` | POST | Cancel an open follow-up | - | follow-ups/components/AllFollowUps.tsx | Bearer | Integrated | No | No |
| `/api/v1/admin/enquiries/{enquiry_id}/activity` | GET | Status, assignment and follow-up history of one enquiry, with actor names | - | business-enquiries/components/EnquiryActivity.tsx | Bearer | Integrated | No | No |
| `/api/v1/admin/feed` | GET | Your own notification feed (meta.unread counts unread, non-archived items) | communication/services/communicationService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/feed/read-all` | POST | Mark all as read | communication/services/communicationService.ts | communication/pages/NotificationsFeedPage.tsx | Bearer | Integrated | No | No |
| `/api/v1/admin/feed/{item_id}/read` | POST | Mark one as read | communication/services/communicationService.ts | communication/pages/NotificationsFeedPage.tsx | Bearer | Integrated | No | No |
| `/api/v1/admin/feed/{item_id}/archive` | POST | Archive one item | communication/services/communicationService.ts | communication/pages/NotificationsFeedPage.tsx | Bearer | Integrated | No | No |
| `/api/v1/admin/assignees` | GET | Active staff who can own enquiries or applications (names and roles only) | partner-applications/services/partnerApplicationsService.ts, business-enquiries/services/businessEnquiriesService.ts | - | Bearer | Integrated | No | Prior shape-probe, not re-run |
| `/api/v1/admin/accounts` | GET | All staff and partner accounts with invitation state (super administrator) | partner-accounts/services/partnerAccountsService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/accounts/metrics` | GET | Account counts by type, status and staff role (super administrator) | partner-accounts/services/partnerAccountsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/accounts/{user_id}` | GET | One account with its recent activity (super administrator) | - | - | Bearer | Not used | - | No |
| `/api/v1/admin/accounts/{user_id}/invitation/resend` | POST | Issue a fresh invitation link (replaces older ones); rate limited | partner-accounts/services/partnerAccountsService.ts | partner-accounts/components/AccountsDirectory.tsx | Bearer | Integrated | No | No |
| `/api/v1/admin/accounts/{user_id}/invitation/revoke` | POST | Cancel the open invitation; the account stays un-activated | partner-accounts/services/partnerAccountsService.ts | partner-accounts/components/AccountsDirectory.tsx | Bearer | Integrated | No | No |
| `/api/v1/admin/accounts/{user_id}/password-reset` | POST | Email the account holder a password-reset link (admins never see or set passwords) | partner-accounts/services/partnerAccountsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/accounts/{user_id}/suspend` | POST | Suspend an account and sign it out everywhere (never yourself) | partner-accounts/services/partnerAccountsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/accounts/{user_id}/reactivate` | POST | Reactivate a suspended account (needs a password; otherwise re-invite instead) | partner-accounts/services/partnerAccountsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/documents` | GET | Partner documents across organisations (current version of each) | - | document-management/components/DocumentQueue.tsx | Bearer | Integrated | Unit (heuristic) | Prior shape-probe, not re-run |
| `/api/v1/admin/documents/{document_id}/history` | GET | Document versions and their staff review outcomes | - | - | Bearer | Not used | - | No |
| `/api/v1/admin/security-policy` | GET | Effective password, session, MFA, rate-limit and upload policy (read-only) | - | settings/pages/SecuritySettingsPage.tsx | Bearer | Integrated | No | Prior shape-probe, not re-run |
| `/api/v1/admin/content` | POST | Create a draft | content-management/services/contentManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/content` | GET | List Admin | content-management/services/contentManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/content/{item_id}` | GET | Get One | content-management/services/contentManagementService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/content/{item_id}` | PATCH | Edit a draft (stores a new version) | content-management/services/contentManagementService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/content/{item_id}/versions` | GET | Versions | content-management/services/contentManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/content/{item_id}/submit` | POST | draft -> in_review | content-management/services/contentManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/content/{item_id}/approve` | POST | in_review -> approved (super administrator) | content-management/services/contentManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/content/{item_id}/reject` | POST | in_review -> draft with a note (super administrator) | content-management/services/contentManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/content/{item_id}/publish` | POST | approved -> published | content-management/services/contentManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/content/{item_id}/schedule` | POST | Schedule approved, claims-cleared content for future publication | content-management/services/contentManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/content/{item_id}/schedule` | DELETE | Cancel a scheduled publication | content-management/services/contentManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/content/{item_id}/unpublish` | POST | Unpublish | content-management/services/contentManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/content/{item_id}/reopen` | POST | Back to draft for editing (removes it from the site) | content-management/services/contentManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/content/{item_id}/archive` | POST | Archive | content-management/services/contentManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/content/{item_id}/attachment` | POST | Attach a downloadable document with a version label (draft only) | content-management/services/contentManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/content-claims` | POST | Register a public claim (starts as pending_verification) | content-management/services/contentManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/content-claims` | GET | List Claims | content-management/services/contentManagementService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/content-claims/{claim_id}` | PATCH | Edit a claim (verification: super administrator). Un-clearing pulls content offline | content-management/services/contentManagementService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/meetings/{enquiry_id}/confirm` | POST | Confirm after checking real calendar availability | business-enquiries/services/businessEnquiriesService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/meetings/{enquiry_id}/decline` | POST | Decline | business-enquiries/services/businessEnquiriesService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/meetings/{enquiry_id}/cancel` | POST | Cancel | business-enquiries/services/businessEnquiriesService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/privacy-requests` | GET | Privacy requests (super administrator) | governance/service.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/privacy-requests/{request_id}` | POST | Update Privacy | governance/service.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/reports/newsletter.csv` | GET | Newsletter subscribers (super administrator; audited) | reports/services/reportsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/privacy-requests/{request_id}/execute` | POST | Execute an in-progress deletion request (anonymises contact data) | governance/service.ts | - | Bearer | Integrated | No | No |
| `/api/v1/admin/profile-change-requests` | GET | Profile change requests (super administrator) | governance/service.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/admin/profile-change-requests/{request_id}/decide` | POST | Admin Decide | governance/service.ts | - | Bearer | Integrated | No | No |
| `/api/v1/reviewer/applications/{application_id}/document-requests` | POST | Ask the partner for an additional document, with an optional deadline | - | application-review/components/DocumentRequests.tsx | Bearer | Integrated | No | No |
| `/api/v1/reviewer/applications/{application_id}/document-requests` | GET | Document requests of one application | - | application-review/components/DocumentRequests.tsx | Bearer | Integrated | No | No |
| `/api/v1/reviewer/document-requests/{request_id}/cancel` | POST | Withdraw an open request | - | application-review/components/DocumentRequests.tsx | Bearer | Integrated | No | No |
| `/api/v1/reviewer/invitations` | POST | Invite a partner user (super administrator only) | onboarding/services/onboardingService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/reviewer/applications` | GET | Applications you may review (assigned to you; super administrators see all submitted) | dashboard/services/dashboardService.ts, partner-applications/services/partnerApplicationsService.ts | - | Bearer | Integrated | Unit (heuristic) | Prior shape-probe, not re-run |
| `/api/v1/reviewer/transitions` | GET | Every status change a reviewer may make, with its requirements | partner-applications/services/partnerApplicationsService.ts | - | Bearer | Integrated | Unit (heuristic) | Prior shape-probe, not re-run |
| `/api/v1/reviewer/applications/{application_id}` | GET | Review details: profile, documents, eligibility records, history | partner-applications/services/partnerApplicationsService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/reviewer/applications/{application_id}/assign` | POST | Assign | partner-applications/services/partnerApplicationsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/reviewer/applications/{application_id}/transition` | POST | Move the application to another permitted stage | partner-applications/services/partnerApplicationsService.ts | - | Bearer | Integrated | Unit (heuristic) | No |
| `/api/v1/reviewer/applications/{application_id}/information-requests` | POST | Request additional information (moves the application to information_requested) | partner-applications/services/partnerApplicationsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/reviewer/applications/{application_id}/messages` | GET | Messages | partner-applications/services/partnerApplicationsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/reviewer/applications/{application_id}/notes` | POST | Add an internal note (never visible to partners) | partner-applications/services/partnerApplicationsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/reviewer/applications/{application_id}/notes` | GET | List Notes | partner-applications/services/partnerApplicationsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/reviewer/applications/{application_id}/eligibility-verifications` | POST | Record a human eligibility verification (no automatic approval or rejection) | partner-applications/services/partnerApplicationsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/reviewer/applications/{application_id}/eligibility-verifications` | GET | List Eligibility | partner-applications/services/partnerApplicationsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/reviewer/applications/{application_id}/documents/{document_id}/review` | POST | Record a document review outcome (comment is visible to the partner) | partner-applications/services/partnerApplicationsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/reviewer/applications/{application_id}/documents/{document_id}/download` | GET | Download a document of an application you review (audited) | partner-applications/services/partnerApplicationsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/reviewer/applications/{application_id}/history` | GET | Audit trail for the application (reviewer-only) | partner-applications/services/partnerApplicationsService.ts | - | Bearer | Integrated | No | No |

## partner

| Endpoint | Method | Backend purpose | Frontend service | Consuming module | Auth | Status | Unit tests | Live-verified |
|---|---|---|---|---|---|---|---|---|
| `/api/v1/partner/privacy-requests` | POST | Submit a data access / correction / deletion request as the signed-in partner | partner/services/partnerSettingsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/privacy-requests` | GET | Your own privacy requests | partner/services/partnerSettingsService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/applications` | GET | Own applications | partner/services/partnerDashboardService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/applications` | POST | Create a draft application | partner/services/partnerDashboardService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/applications/{application_id}` | GET | Get One | partner/services/partnerDashboardService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/applications/{application_id}` | PATCH | Update | partner/services/partnerDashboardService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/applications/{application_id}/readiness` | GET | Get Readiness | partner/services/partnerDashboardService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/applications/{application_id}/submit` | POST | Submit the draft for review (profile and required documents must be complete) | partner/services/partnerDashboardService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/applications/{application_id}/resubmit` | POST | Resubmit after answering every information request | partner/services/partnerDashboardService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/applications/{application_id}/withdraw` | POST | Withdraw | partner/services/partnerDashboardService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/applications/{application_id}/history` | GET | Status history (partner-visible fields only) | partner/services/partnerDashboardService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/applications/{application_id}/messages` | GET | Partner-visible messages (information requests and your responses) | partner/services/partnerDashboardService.ts, partner/services/partnerDocumentService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/applications/{application_id}/messages` | POST | Respond to an open information request | partner/services/partnerDashboardService.ts, partner/services/partnerDocumentService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/organization` | GET | Own organization | partner/services/partnerProfileService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/organization` | PUT | Update own profile (partial update, recorded in history) | partner/services/partnerProfileService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/organization/completion` | GET | Get Completion | partner/services/partnerDashboardService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/organization/editable-fields` | GET | Profile fields and direct-update/null-clearing behavior | - | partner/components/ProfileSection.tsx | Bearer | Integrated | No | No |
| `/api/v1/partner/organization/history` | GET | Get History | partner/services/partnerProfileService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/organization/change-requests` | GET | List Requests | partner/services/partnerProfileService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/organization/change-requests` | POST | Ask staff to approve a profile change | partner/services/partnerProfileService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/notifications` | GET | Messages sent to you with read state (meta has total and unread counts) | partner/services/partnerDashboardService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/notifications/unread-count` | GET | Number of unread messages | partner/services/partnerDashboardService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/notifications/{notification_id}/unread` | POST | Mark one message as unread again | partner/services/partnerDashboardService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/notifications/read-all` | POST | Mark all your messages as read | partner/services/partnerDashboardService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/notifications/{notification_id}/read` | POST | Mark one message as read (only your own; others are 404) | partner/services/partnerDashboardService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/enquiries` | GET | Enquiry history: your organization's origin enquiry and your own submissions | partner/services/partnerDashboardService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/documents` | GET | Own documents | partner/services/partnerDashboardService.ts, partner/services/partnerDocumentService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/documents` | POST | Upload a new document (private, quarantined; no malware scanner configured) | partner/services/partnerDashboardService.ts, partner/services/partnerDocumentService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/documents/{document_id}` | GET | Get One | partner/services/partnerDocumentService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/documents/{document_id}` | DELETE | Remove | partner/services/partnerDocumentService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/documents/{document_id}/versions` | POST | Replace a document with a new version (old versions are kept) | partner/services/partnerDocumentService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/documents/{document_id}/history` | GET | History | partner/services/partnerDocumentService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/documents/{document_id}/download` | GET | Download a document you own (authorised, audited; no public URLs exist) | partner/services/partnerDocumentService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/document-requests` | GET | Document requests for your organisation (meta.open counts open ones) | partner/services/partnerDocumentService.ts | - | Bearer | Integrated | No | No |
| `/api/v1/partner/document-requests/{request_id}` | GET | One document request (other organisations' ids return 404) | - | - | Bearer | Not used | - | No |

## public-site

| Endpoint | Method | Backend purpose | Frontend service | Consuming module | Auth | Status | Unit tests | Live-verified |
|---|---|---|---|---|---|---|---|---|
| `/api/v1/enquiries/contact` | POST | Submit a general contact enquiry | - | - | Public | Out of scope (public site API) | - | No |
| `/api/v1/enquiries/{reference_number}/status` | GET | Public status lookup (reference + lookup token) | - | - | Public | Out of scope (public site API) | - | No |
| `/api/v1/enquiries/project` | POST | Submit a project enquiry (IT or Non-IT category) | - | - | Public | Out of scope (public site API) | - | No |
| `/api/v1/enquiries/partner` | POST | Submit a partner application | - | - | Public | Out of scope (public site API) | - | No |
| `/api/v1/enquiries/strategic` | POST | Submit a confidential strategic / merger / integration enquiry | - | - | Public | Out of scope (public site API) | - | No |
| `/api/v1/documents/upload` | POST | Upload a supporting document (private storage, quarantined) | - | - | Public | Out of scope (public site API) | - | No |
| `/api/v1/catalog/project-categories` | GET | Project categories, always labelled illustrative (PRD s.9, s.28) | - | - | Public | Out of scope (public site API) | - | No |
| `/api/v1/catalog/partner-criteria` | GET | Proposed screening criteria, pathways and submission checklist (PRD s.8) | - | - | Public | Out of scope (public site API) | - | No |
| `/api/v1/site/contact` | GET | Verified contact details only; unconfirmed or omitted items are absent | - | - | Public | Out of scope (public site API) | - | No |
| `/api/v1/content` | GET | Published content: search, filter by type/category/tag | - | - | Public | Out of scope (public site API) | - | No |
| `/api/v1/content/sitemap` | GET | Slugs and last-modified times of published content (SEO) | - | - | Public | Out of scope (public site API) | - | No |
| `/api/v1/content/{slug}` | GET | Get Public | - | - | Public | Out of scope (public site API) | - | No |
| `/api/v1/content/{slug}/download` | GET | Download the attachment of published content | - | - | Public | Out of scope (public site API) | - | No |
| `/api/v1/meetings` | POST | Request an introductory meeting (not a confirmed booking) | - | - | Public | Out of scope (public site API) | - | No |
| `/api/v1/newsletter/subscribe` | POST | Newsletter opt-in (consent recorded; nothing is sent by this API) | - | - | Public | Out of scope (public site API) | - | No |
| `/api/v1/newsletter/unsubscribe` | POST | Newsletter Unsubscribe | - | - | Public | Out of scope (public site API) | - | No |
| `/api/v1/privacy/requests` | POST | Data access / correction / deletion request | - | - | Public | Out of scope (public site API) | - | No |
| `/api/v1/privacy/requests/verify` | POST | Confirm the email address of a privacy request (link from the email, single use) | - | auth/pages/PrivacyVerifyPage.tsx | Public | Integrated | Unit (heuristic) | No |

## ops

| Endpoint | Method | Backend purpose | Frontend service | Consuming module | Auth | Status | Unit tests | Live-verified |
|---|---|---|---|---|---|---|---|---|
| `/health` | GET | Health | - | - | Public | Out of scope (ops) | - | No |
| `/health/live` | GET | Live | - | - | Public | Out of scope (ops) | - | No |
| `/health/ready` | GET | Ready | - | - | Public | Out of scope (ops) | - | No |
| `/api/v1/meta` | GET | Meta | - | - | Public | Out of scope (ops) | - | No |

