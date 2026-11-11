# Frontend Feature Coverage Matrix

_Audit date 2026-11-11. Source-code verified (every row traced UI -> hook/handler -> service -> HTTP call -> UI update by reading the files listed). Not runtime verified: no staging credentials were available. Source paths are relative to `src/`._

Classification rules: legitimate static content (labels, navigation, enum option lists that mirror OpenAPI enums, status-badge mapping, route tables, capability/explanatory text, empty-state copy for backend-blocked features) is **not** counted as a defect. A "Backend Blocked" row means the UI honestly says the feature is unavailable because no backend endpoint exists in the current OpenAPI document.

| Portal | Module | Feature | Classification | Backend Endpoint | Source File | Evidence | Required Action |
|---|---|---|---|---|---|---|---|
| Admin Console | Auth | Staff login | Fully Dynamic | POST /auth/login | features/auth/pages/LoginPage.tsx; services/authService.ts | authService.login -> api.post -> tokens in authStore -> GET /auth/me | - |
| Admin Console | Auth | MFA enroll / confirm / verify (TOTP + recovery code) | Fully Dynamic | POST /auth/mfa/enroll|confirm|verify | features/auth/pages/LoginPage.tsx | Staged login flow calls the three endpoints; recovery codes shown once | - |
| Admin Console | Auth | Session restore + token refresh + logout | Fully Dynamic | POST /auth/refresh|logout, GET /auth/me | features/auth/services/authService.ts; services/api/client.ts | Single-flight 401->refresh interceptor; restore.test.ts (mocked) | Runtime-verify refresh rotation on staging |
| Admin Console | Auth | Forgot / reset password | Fully Dynamic | POST /auth/password-reset/request|confirm | features/auth/pages/ForgotPasswordPage.tsx; ResetPasswordPage.tsx | useMutation -> authService | - |
| Admin Console | Auth | Change password | Fully Dynamic | POST /auth/change-password | features/auth/pages/ChangePasswordPage.tsx | changePassword.test.ts (mocked) | - |
| Admin Console | Auth | Edit own profile (name, phone) | Fully Dynamic | PATCH /auth/me | features/auth/components/ProfileEditor.tsx | Inline ME constant, api.patch | - |
| Admin Console | Auth | Role-based module gating | Partially Dynamic | GET /auth/permissions (consumed; static map is the fallback) | config/permissions.ts; features/auth/components/guards.tsx | ROLE_MODULES is a hardcoded map (self-labelled "PENDING"); backend still enforces 403 | None: consumed with static fallback; map is a UI hint |
| Admin Console | Auth | Staff active-session list / revoke | Fully Dynamic | GET|DELETE /auth/sessions[/{id}] | (none) | Only partner portal calls these | - |
| Admin Console | Auth | Staff recovery-code regeneration | Fully Dynamic | POST /auth/mfa/recovery-codes | (none) | Only partner portal calls it | - |
| Admin Console | Dashboard | Backend overview counters | Fully Dynamic | GET /admin/overview | features/dashboard/pages/DashboardPage.tsx; services/dashboardService.ts | "Backend overview counters" panel renders overview.data | Type the dict once spec is typed |
| Admin Console | Dashboard | KPIs (date-range) | Fully Dynamic | GET /admin/reports/kpis | features/dashboard/hooks/useDashboardData.ts | Query keyed on range; role-gated | - |
| Admin Console | Dashboard | Enquiry / application / partner charts | Fully Dynamic | GET /admin/enquiries, /reviewer/applications, /admin/organizations | features/dashboard/pages/DashboardPage.tsx; utils/transform.ts | Real data, but aggregated client-side from latest PAGE_SIZE rows; a truncation banner is shown (line ~191) | Bounded: paged to completion, 5,000-row ceiling, explicit incomplete note if hit; server aggregates would remove the ceiling and the cost |
| Admin Console | Enquiries | List, filter, search, pagination, sort | Fully Dynamic | GET /admin/enquiries | features/business-enquiries/pages/EnquiriesPage.tsx; hooks/useEnquiries.ts | Params forwarded to backend; meta.total drives pagination | - |
| Admin Console | Enquiries | Enquiry detail | Fully Dynamic | GET /admin/enquiries/{id} | features/business-enquiries/pages/EnquiryDetailPage.tsx | useEnquiryDetail | - |
| Admin Console | Enquiries | Change status / priority | Fully Dynamic | PATCH /admin/enquiries/{id} | features/business-enquiries/components/EnquiryActions.tsx | useEnquiryMutation -> api.patch -> invalidate | - |
| Admin Console | Enquiries | Assign / clear lead owner | Fully Dynamic | POST /admin/enquiries/{id}/assign | features/business-enquiries/components/EnquiryActions.tsx | service.assign | - |
| Admin Console | Enquiries | Add follow-up / complete follow-up | Fully Dynamic | POST .../follow-ups, .../complete | features/business-enquiries/components/EnquiryActions.tsx | service.followUp / completeFollowUp | - |
| Admin Console | Enquiries | Attachments list + audited download | Fully Dynamic | GET .../documents, .../download | features/business-enquiries/components/EnquiryDocuments.tsx | Blob download through shared client | - |
| Admin Console | Enquiries | Activity timeline | Fully Dynamic | GET /admin/enquiries/{id}/activity | features/business-enquiries/components/EnquiryActivity.tsx | Inline api.get | - |
| Admin Console | Enquiries | Meeting confirm / decline / cancel | Fully Dynamic | POST /admin/meetings/{id}/confirm|decline|cancel | features/business-enquiries/services/businessEnquiriesService.ts | service.meeting* used by EnquiryActions | - |
| Admin Console | Enquiries | Enquiry overview counts | Fully Dynamic | GET /admin/enquiries (meta.total) | features/business-enquiries/pages/EnquiryOverviewPage.tsx | Exact totals from page_size=1 queries | - |
| Admin Console | Strategic enquiries | List / detail / overview | Fully Dynamic | GET /admin/enquiries?type=strategic | features/strategic-enquiries/pages/* | Wraps EnquiriesPage scope="strategic" | - |
| Admin Console | Lead assignment | Lead list + (re)assignment | Fully Dynamic | GET /admin/enquiries, POST .../assign, GET /admin/assignees | features/lead-assignment/pages/LeadAssignmentPage.tsx | useLeadList, useStaffNames | - |
| Admin Console | Lead assignment | Workload by assignee | Fully Dynamic | GET /admin/workload | features/lead-assignment/services/leadAssignmentService.ts:77 | api.get /admin/workload | - |
| Admin Console | Lead assignment | Category counts / tallies | Fully Dynamic | GET /admin/enquiries | features/lead-assignment/utils/assignment.ts:86 | Tallies the supplied rows only; code comment requires a "sample" disclosure | Sample tally has no caller; workload from GET /admin/workload, category counts from backend totals |
| Admin Console | Discussions | Discussions metrics + list | Partially Dynamic | GET /admin/enquiries, /reviewer/applications | features/discussions/pages/DiscussionsPage.tsx; follow-ups/services/followUpsService.ts | Exact totals; "pending responses" is a proxy (applications in information_requested) | Backend has no discussion/thread resource |
| Admin Console | Follow-ups | All follow-ups queue + filters | Fully Dynamic | GET /admin/follow-ups | features/follow-ups/components/AllFollowUps.tsx | e.allFollowUps with status/kind/mine/due filters | - |
| Admin Console | Follow-ups | Cancel follow-up | Fully Dynamic | POST .../follow-ups/{id}/cancel | features/follow-ups/components/AllFollowUps.tsx:42 | api.post | - |
| Admin Console | Follow-ups | Edit / reassign follow-up | Fully Dynamic | PATCH .../follow-ups/{id} | features/follow-ups/components/AllFollowUps.tsx:44 | Only { due_at } is sent; note + assignee_id unsupported in UI | - |
| Admin Console | Applications | List / filter / search / pagination | Fully Dynamic | GET /reviewer/applications | features/partner-applications/pages/ApplicationsPage.tsx | useApplicationList | - |
| Admin Console | Applications | Detail (profile, docs, eligibility, history) | Fully Dynamic | GET /reviewer/applications/{id} | features/partner-applications/pages/ApplicationDetailPage.tsx | useApplicationDetail | - |
| Admin Console | Applications | Assign reviewer | Fully Dynamic | POST .../assign; GET /admin/assignees | features/partner-applications/components/ReviewActions.tsx | service.assign | - |
| Admin Console | Applications | Status transition (rules from backend) | Fully Dynamic | GET /reviewer/transitions; POST .../transition | features/partner-applications/components/ReviewActions.tsx | Allowed moves fetched, not hardcoded | - |
| Admin Console | Applications | Request additional information | Fully Dynamic | POST .../information-requests | features/partner-applications/components/ReviewActions.tsx | service.requestInfo | - |
| Admin Console | Applications | Internal notes (add/list) | Fully Dynamic | GET|POST .../notes | features/partner-applications/components/ReviewActions.tsx | service.notes/addNote | - |
| Admin Console | Applications | Eligibility verification record | Fully Dynamic | GET|POST .../eligibility-verifications | features/application-review/pages/ApplicationReviewWorkspacePage.tsx | service.recordEligibility | - |
| Admin Console | Applications | Document review outcome + download | Fully Dynamic | POST .../documents/{id}/review, GET .../download | features/partner-applications/services/partnerApplicationsService.ts | reviewDocument / downloadDocument | - |
| Admin Console | Applications | Messages + audit history | Fully Dynamic | GET .../messages, .../history | features/application-review/pages/ApplicationReviewWorkspacePage.tsx | useMessages, useAudit | - |
| Admin Console | Application reviews | Review queue + workspace | Fully Dynamic | GET /reviewer/applications | features/application-review/pages/ApplicationReviewsPage.tsx | useApplicationList | - |
| Admin Console | Documents | Partner document queue + per-version review history | Fully Dynamic | GET /admin/documents, .../{id}/history | features/document-management/components/DocumentQueue.tsx | Inline api.get with filters; exact counts via meta.total | - |
| Admin Console | Documents | Per-application documents + workspace | Fully Dynamic | GET /reviewer/applications/{id} | features/document-management/pages/ApplicationDocumentsPage.tsx; DocumentWorkspacePage.tsx | useApplicationDetail, useSecureDocument | - |
| Admin Console | Documents | Document requests (create / list / cancel) | Fully Dynamic | POST|GET /reviewer/applications/{id}/document-requests; POST /reviewer/document-requests/{id}/cancel | features/application-review/components/DocumentRequests.tsx | Inline api calls (lines 41-47) | - |
| Admin Console | Onboarding | Approved applicants list + workspace | Fully Dynamic | GET /reviewer/applications | features/onboarding/pages/ApprovedApplicantsPage.tsx; OnboardingWorkspacePage.tsx | useApprovedApplicants | - |
| Admin Console | Onboarding | Onboarding overview (doc counts) | Partially Dynamic | GET /reviewer/applications/{id} | features/onboarding/pages/OnboardingPage.tsx:16,27 | Document counts only for DETAIL_CAP=25 most recent applicants (disclosed in UI) | Backend aggregate or paginate details |
| Admin Console | Onboarding | Invite partner (provisioning) | Fully Dynamic | POST /reviewer/invitations | features/onboarding/services/onboardingService.ts; components/ProvisioningPanel.tsx | api.post, 409 handling | - |
| Admin Console | Partners | Partner list / search / status filter | Fully Dynamic | GET /admin/organizations | features/partner-management/pages/PartnersPage.tsx | usePartnerList | - |
| Admin Console | Partners | Partner detail + revisions + activity | Fully Dynamic | GET /admin/organizations/{id}[/revisions|/activity] | features/partner-management/pages/PartnerDetailPage.tsx | usePartnerDetail / Revisions / Activity | - |
| Admin Console | Partners | Suspend / reactivate organization | Fully Dynamic | POST /admin/organizations/{id}/status | features/partner-management/hooks/usePartners.ts | useSetPartnerStatus (reason 1..4000) | - |
| Admin Console | Partner accounts | Account directory + metrics | Fully Dynamic | GET /admin/accounts, /accounts/metrics | features/partner-accounts/pages/PartnerAccountsPage.tsx | useAccountMetrics, list | - |
| Admin Console | Partner accounts | Resend / revoke invitation, suspend, reactivate, password-reset email | Fully Dynamic | POST /admin/accounts/{id}/... | features/partner-accounts/services/partnerAccountsService.ts:21 | accountAction with confirmation dialogs | - |
| Admin Console | Partner accounts | Account detail page | Fully Dynamic | GET /admin/accounts/{id} (unused) | features/partner-accounts/pages/PartnerAccountDetailPage.tsx | Uses org detail + audit events; per-account endpoint never called | Account holders section: GET /admin/accounts (matched on organization.id) then GET /admin/accounts/{user_id}; super administrator only |
| Admin Console | Communications | Outbox delivery tracking + filters | Fully Dynamic | GET /admin/notifications | features/communication/pages/DeliveryPage.tsx | useOutbox | - |
| Admin Console | Communications | Dispatch / retry failed emails | Fully Dynamic | POST /admin/notifications/dispatch, .../{id}/retry | features/communication/hooks/useCommunication.ts | useDispatch / useRetry | - |
| Admin Console | Communications | Email templates (list, edit, preview, revert, placeholders) | Fully Dynamic | GET|PUT|DELETE /admin/notification-templates... | features/communication/pages/TemplatesPage.tsx | Five hooks | - |
| Admin Console | Communications | Delivery metrics | Fully Dynamic | GET /admin/notifications (meta.total) | features/communication/pages/CommunicationsPage.tsx | Four exact status totals | - |
| Admin Console | Communications | Email composer | Backend Blocked | (none: no send endpoint) | features/communication/pages/UnavailablePages.tsx | EmptyState; CommunicationsPage link "Not available: no send endpoint" | Backend must add send endpoint |
| Admin Console | Communications | Notification preferences | Backend Blocked | (none) | features/communication/pages/UnavailablePages.tsx | EmptyState | Backend must add preferences API |
| Admin Console | Notifications | Staff notification feed (read / archive / read-all) | Fully Dynamic | GET /admin/feed, POST .../read|archive|read-all | features/communication/pages/NotificationsFeedPage.tsx | communicationService.feed* | - |
| Admin Console | Website content | Content list / filter / editor / versions | Fully Dynamic | GET|POST|PATCH /admin/content[/{id}][/versions] | features/content-management/pages/WebsitePagesPage.tsx; ContentEditorPage.tsx | useContentList, useCreateContent, useUpdate | - |
| Admin Console | Website content | Workflow: submit/approve/reject/publish/unpublish/reopen/archive | Fully Dynamic | POST /admin/content/{id}/{action} | features/content-management/hooks/useContent.ts | useContentAction | - |
| Admin Console | Website content | Schedule / cancel schedule | Fully Dynamic | POST|DELETE /admin/content/{id}/schedule | features/content-management/pages/ContentEditorPage.tsx | useSchedule | - |
| Admin Console | Website content | Attachment upload | Fully Dynamic | POST /admin/content/{id}/attachment | features/content-management/services/contentManagementService.ts:50 | multipart form | - |
| Admin Console | Website content | Approval queue | Fully Dynamic | GET /admin/content?status=in_review | features/content-management/pages/WebsitePagesPage.tsx (queue) | Filtered list | - |
| Admin Console | Website content | Claims register (create / list / verify) | Fully Dynamic | GET|POST|PATCH /admin/content-claims | features/content-management/pages/ClaimsPage.tsx | useClaims/useCreateClaim/useUpdateClaim | - |
| Admin Console | Website content | Website dashboard counts | Fully Dynamic | GET /admin/content (meta.total) | features/content-management/pages/WebsiteDashboardPage.tsx | useContentTotal | - |
| Admin Console | Website content | Homepage / Services / Industries / Media library pages | Backend Blocked | (none) | features/content-management/pages/UnavailablePages.tsx | Static explanatory pages; backend has only generic "content" | Backend must add endpoints |
| Admin Console | Reports | Overview / enquiry / application / partner / communication sections | Fully Dynamic | GET /admin/enquiries, /reviewer/applications, /admin/organizations, /admin/notifications | features/reports/components/Sections.tsx; utils/aggregate.ts:35 | Exact totals from meta; row-level charts fetch max 5 x 100 rows (MAX_PAGES) and flag partial | Bounded: paged to completion (5,000-row ceiling), Partial dataset note if hit; totals always exact |
| Admin Console | Reports | Follow-up / document-review / communications reports | Fully Dynamic | GET /admin/reports/follow-ups|document-review|communications | features/reports/components/BackendReports.tsx | api.get with date range | - |
| Admin Console | Reports | CSV exports (enquiries, applications, newsletter) | Fully Dynamic | GET /admin/reports/*.csv | features/reports/services/reportsService.ts:15; services/api/csv.ts | downloadCsv blob; csv.test.ts covers formula safety (mocked) | - |
| Admin Console | Users | Staff list + invite | Fully Dynamic | GET|POST /admin/users | features/user-management/pages/UsersPage.tsx | useStaffList / invite (409 handled) | - |
| Admin Console | Users | Change role / activate / deactivate | Fully Dynamic | POST /admin/users/{id}/role|activate|deactivate | features/user-management/pages/UserDetailPage.tsx | useStaffMutation | - |
| Admin Console | Users | MFA reset | Fully Dynamic | POST /admin/users/{id}/mfa-reset | features/user-management/services/userManagementService.ts:20 | resetMfa | - |
| Admin Console | Users | Per-user activity | Fully Dynamic | GET /admin/audit?actor_user_id= | features/user-management/services/userManagementService.ts:10 | useStaffActivity | - |
| Admin Console | Roles & permissions | Role overview (names, member counts, nav hints) | Partially Dynamic | GET /admin/users | features/roles-permissions/pages/RolesPage.tsx | Member counts live; role names/modules from hardcoded config/permissions.ts | Acceptable presentation; see permission matrix row |
| Admin Console | Roles & permissions | Permission matrix / role editing | Backend Blocked | (none) | features/roles-permissions/services/rolesPermissionsService.ts | list() always rejects NotConfiguredError | Backend must publish permissions API |
| Admin Console | Audit logs | Audit list / filters / pagination | Fully Dynamic | GET /admin/audit, /audit/actions | features/audit-logs/pages/AuditLogsPage.tsx | useAuditPage, useAuditActions | - |
| Admin Console | Audit logs | Audit event detail | Fully Dynamic | GET /admin/audit/{id} | features/audit-logs/pages/AuditLogDetailPage.tsx | useAuditEvent | - |
| Admin Console | Audit logs | CSV export | Fully Dynamic | GET /admin/audit.csv | features/audit-logs/services/auditLogsService.ts:33 | exportCsv | - |
| Admin Console | Audit logs | By-administrator / by-module breakdowns | Fully Dynamic | GET /admin/audit | features/audit-logs/hooks/useAudit.ts:21 | Computed from the latest 100 events and labelled "sample" | Bounded: all events paged (5,000 ceiling); incomplete note if hit |
| Admin Console | Governance | Privacy requests (list / update / execute deletion) | Fully Dynamic | GET|POST /admin/privacy-requests... | features/governance/pages/GovernancePage.tsx | governanceService | - |
| Admin Console | Governance | Profile change request decisions | Fully Dynamic | GET /admin/profile-change-requests, POST .../decide | features/governance/pages/GovernancePage.tsx | governanceService.decide | - |
| Admin Console | Governance | Launch readiness | Fully Dynamic | GET /admin/launch-readiness | features/governance/service.ts | readiness() | - |
| Admin Console | Settings | System settings list / put / delete | Fully Dynamic | GET|PUT|DELETE /admin/settings[/{key}] | features/settings/pages/SettingsPage.tsx; utils/settings.ts | Response shape untyped; parser guesses layouts | Runtime-verify shape |
| Admin Console | Settings | Security policy (read-only) | Fully Dynamic | GET /admin/security-policy | features/settings/pages/SecuritySettingsPage.tsx | useQuery | - |
| Partner Portal | Auth | Partner login + MFA | Fully Dynamic | POST /auth/login, /auth/mfa/verify | partner/pages/PartnerLoginPage.tsx; partner/services/partnerAuthService.ts | Shared authService + partner session mapping | - |
| Partner Portal | Auth | Account activation (invitation accept) | Fully Dynamic | POST /auth/invitations/accept | partner/pages/PartnerActivatePage.tsx | authService.acceptInvitation; activation.test.tsx (mocked) | - |
| Partner Portal | Auth | Forgot / reset password | Fully Dynamic | POST /auth/password-reset/* | features/auth/pages/ForgotPasswordPage.tsx (loginRoute prop) | Shared pages | - |
| Partner Portal | Dashboard | Dashboard (application, completion, documents, notifications, enquiries panels) | Fully Dynamic | GET /partner/applications|organization/completion|documents|notifications|enquiries | partner/pages/PartnerDashboardPage.tsx; hooks/usePartnerDashboard.ts | Five independent queries with error states | - |
| Partner Portal | Application | View application, status, partner-visible history | Fully Dynamic | GET /partner/applications, .../history | partner/pages/PartnerApplicationPage.tsx; hooks/useApplicationTracking.ts | Stage list derived from live status | - |
| Partner Portal | Application | Create application (draft) | Fully Dynamic | POST /partner/applications | (none) | Never called; page says "When your partner application is created it will appear here" | - |
| Partner Portal | Application | Edit draft (pathway, cover note) | Fully Dynamic | PATCH /partner/applications/{id} | partner/components/ApplicationActions.tsx:67 | save mutation | - |
| Partner Portal | Application | Readiness check | Fully Dynamic | GET .../readiness | partner/components/ApplicationActions.tsx:56 | Drives submit-disabled state | - |
| Partner Portal | Application | Submit / resubmit | Fully Dynamic | POST .../submit|resubmit | partner/components/ApplicationActions.tsx:76-85 | mutations + invalidate | - |
| Partner Portal | Application | Withdraw | Fully Dynamic | POST .../withdraw | partner/components/ApplicationActions.tsx:86 | WITHDRAWABLE statuses list is a UI hint; backend returns 409 | - |
| Partner Portal | Onboarding | Onboarding tracker | Fully Dynamic | GET /partner/applications, history, messages, documents | partner/pages/PartnerOnboardingPage.tsx; hooks/useOnboarding.ts | Stages derived client-side from real status history; no onboarding endpoint exists | - |
| Partner Portal | Company profile | View profile + completion | Fully Dynamic | GET /partner/organization[/completion] | partner/pages/PartnerCompanyPage.tsx | usePartnerProfile | - |
| Partner Portal | Company profile | Direct profile update (optimistic locking) | Fully Dynamic | PUT /partner/organization; GET .../editable-fields | partner/components/ProfileSection.tsx; services/partnerProfileService.ts | expected_version sent; 409 on stale | - |
| Partner Portal | Company profile | Change requests + revision history | Fully Dynamic | GET|POST /partner/organization/change-requests; GET .../history | partner/pages/PartnerProfileChangesPage.tsx | usePartnerProfile | - |
| Partner Portal | Documents | List, upload, replace (new version), remove, download, history | Fully Dynamic | /partner/documents* | partner/pages/PartnerDocumentsPage.tsx; services/partnerDocumentService.ts | Backend-decided can_* flags; progress + abort | - |
| Partner Portal | Documents | Document requests + fulfil via request_id | Fully Dynamic | GET /partner/document-requests; POST /partner/documents | partner/hooks/usePartnerDocuments.ts | documentRequests(status) | - |
| Partner Portal | Messages | Reviewer messages + respond to information request | Fully Dynamic | GET|POST /partner/applications/{id}/messages | partner/pages/PartnerMessagesPage.tsx; hooks/useApplicationTracking.ts | respond mutation | - |
| Partner Portal | Follow-ups | Information requests page | Fully Dynamic | GET|POST .../messages | partner/pages/PartnerFollowUpsPage.tsx | Lists real info requests; answers via messages | - |
| Partner Portal | Follow-ups | Staff follow-ups, due dates, completion | Backend Blocked | (none partner-facing) | partner/pages/PartnerFollowUpsPage.tsx (footer note) | Follow-ups are staff-only in spec | Backend must expose partner follow-ups |
| Partner Portal | Notifications | List, read, unread, read-all, unread badge | Fully Dynamic | /partner/notifications* | partner/pages/PartnerNotificationsPage.tsx; layouts/PartnerLayout.tsx | Five endpoints wired | - |
| Partner Portal | Enquiries | Enquiries page (/partner/enquiries) | Fully Dynamic | GET /partner/enquiries | partner/routes.tsx:70; partner/pages/PartnerModulePage.tsx | Renders ModulePlaceholder "Scaffold only"; only a dashboard summary panel uses the endpoint | Read-only by design: spec has no partner enquiry detail/create/reply |
| Partner Portal | Projects | Projects & engagements | Backend Blocked | (none) | partner/pages/PartnerProjectsPage.tsx | Explicit "not yet available" EmptyState; pathway shown from application | Backend must add project endpoints |
| Partner Portal | Performance | Performance scorecards / trends / reports | Backend Blocked | (none) | partner/pages/PartnerPerformancePage.tsx | EmptyState + FEASIBILITY table (static documentation) | Backend must add endpoints |
| Partner Portal | Meetings | Meetings | Backend Blocked | (none partner-facing) | partner/pages/PartnerMeetingsPage.tsx | EmptyState | Backend must add partner meeting endpoints |
| Partner Portal | Team | Team list / invite / roles | Backend Blocked | (none partner-facing) | partner/pages/PartnerTeamPage.tsx | Shows only own account from auth store + EmptyState | Backend must add team endpoints |
| Partner Portal | Settings | Account profile (name, phone) | Fully Dynamic | PATCH /auth/me | partner/pages/PartnerSettingsPage.tsx; features/auth/components/ProfileEditor.tsx | Shared editor | - |
| Partner Portal | Settings | Change password / send reset email | Fully Dynamic | POST /auth/change-password, /password-reset/request | partner/pages/PartnerSecurityPage.tsx | authService + partnerSettingsService | Stale comment in partnerSettingsService.ts (sendPasswordReset doc) says no change-password endpoint |
| Partner Portal | Settings | Active sessions list / revoke / revoke others | Fully Dynamic | GET|DELETE /auth/sessions[/{id}] | partner/pages/PartnerSecurityPage.tsx | partnerSettingsService.sessions/revoke* | - |
| Partner Portal | Settings | MFA disable + recovery-code regeneration | Fully Dynamic | POST /auth/mfa/disable|recovery-codes | partner/pages/PartnerSecurityPage.tsx | Password + code required | - |
| Partner Portal | Settings | Privacy requests (submit / list) | Fully Dynamic | GET|POST /partner/privacy-requests | partner/pages/PartnerPrivacyPage.tsx | useQuery/useMutation | - |
| Partner Portal | Settings | Notification preferences | Backend Blocked | (none) | partner/pages/PartnerSettingsPage.tsx:84 | Text states backend has no preference endpoint | Backend must add endpoint |

## Feature metrics (denominator: 115 features audited; recalculated 2026-11-11, pass 3)

| Classification | Count | % |
|---|---|---|
| Fully Dynamic | 101 | 87.8% |
| Partially Dynamic | 4 | 3.5% |
| Static/Hardcoded | 0 | 0.0% |
| Mocked/Simulated | 0 | 0.0% |
| Not Implemented | 0 | 0.0% |
| Backend Blocked | 10 | 8.7% |

**Admin Console:** 84 features; Fully Dynamic 76, Partially Dynamic 4, Not Implemented 0, Backend Blocked 4.
**Partner Portal:** 31 features; Fully Dynamic 25, Partially Dynamic 0, Not Implemented 0, Backend Blocked 6.

Remaining Partially Dynamic (4): role-based module gating (15 modules backend-derived, the rest by role hint); roles overview (role names from config unless the backend returns `role_matrix`); discussions "pending responses" (proxy; no thread resource); onboarding overview document counts (100 most recent applicants, one detail request each).

"Fully Dynamic" for the row-level aggregations (dashboard charts, report charts, audit breakdowns) means bounded: data is complete up to 5,000 rows and visibly flagged beyond that.

### Verification levels (never combined)

| Level | Features |
|---|---|
| Source-code verified | 115 / 115 |
| Automated-test verified (mocked API, Vitest) | Application creation, partner enquiries, permission mapping, follow-up edit, staff sessions, recovery codes, pagination and partial-data handling, partner account lookup, plus earlier suites. **Not** live-backend evidence |
| Live-backend verified | **0** (no staging credentials) |
| Staging verification blocked | 105 features with an endpoint (115 minus the 10 Backend Blocked, which have nothing to verify) |

## Remediation update (2026-11-11)

| Feature | Before | After | Evidence |
|---|---|---|---|
| Partner application creation | Not Implemented | Fully Dynamic (source + mocked unit test; not runtime verified) | `partner/components/StartApplication.tsx`, test in `PartnerApplicationPage.test.tsx` |
| Partner Enquiries page | Not Implemented (scaffold) | Fully Dynamic read-only list with search, status filter, pagination (spec has no detail/create/reply for partners) | `partner/pages/PartnerEnquiriesPage.tsx` + test |
| Role-based module gating | Partially Dynamic | Backend-derived for 15 modules, role hint for the rest and as failure fallback | `config/permissions.ts` `canAccessWith`, test |
| Roles overview | Partially Dynamic | Shows backend `role_matrix` when returned, hint otherwise | `RolesPage.tsx` |
| Follow-up edit | Partially Dynamic | Fully Dynamic (note, assignee, clear due date, reschedule) | `AllFollowUps.tsx` |
| Staff sessions / recovery codes | Not Implemented | Fully Dynamic (mocked-test coverage only via type/lint; no dedicated unit test) | `StaffSecurity.tsx` |
| Dashboard charts, lead-assignment tallies, onboarding doc counts, report rows, audit breakdowns, discussions metric | Partially Dynamic | **Unchanged.** Still sample-based and labelled; no aggregate endpoints exist | not addressed |
| Partner account detail | Partially Dynamic | **Unchanged** (see endpoint matrix note) | not addressed |
| Backend-blocked features (admin 4, partner 6) | Backend Blocked | Rechecked against live OpenAPI 2026-11-11: no new endpoints; unchanged | spec fetch |

## Pass 3 update (2026-11-11)

| Feature | Before | After | Evidence |
|---|---|---|---|
| Dashboard charts, report row charts, audit breakdowns | Partially Dynamic | Fully Dynamic, bounded at 5,000 rows with explicit incomplete notice | `fetchAll` rewrite; `aggregate.test.ts`, `dashboardService.test.ts`, `DashboardPage.test.tsx`, `useAudit.test.tsx` |
| Lead-assignment category counts | Partially Dynamic | Fully Dynamic | sample tally has no caller; backend totals |
| Partner account detail | Partially Dynamic | Fully Dynamic (super administrator) | `PartnerAccountDetailPage.tsx`, `partnerAccountsService.test.ts` |
| Staff sessions, recovery codes | Untested | Test-covered; recovery-code input now requires exactly 6 digits (spec `MfaCodeIn.code` length 6) | `StaffSecurity.test.tsx` |
| Follow-up edit | Untested | Test-covered (changed-fields-only PATCH, null clears) | `AllFollowUps.test.tsx` |
| Backend-blocked (10) | Backend Blocked | Re-checked against the live OpenAPI: no new endpoints; unchanged | spec diff |
