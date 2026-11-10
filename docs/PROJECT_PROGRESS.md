# Project Progress

Last updated: 2026-11-09

## Stages

| Stage                       | Status                                                                 |
| --------------------------- | ---------------------------------------------------------------------- |
| 1 Foundation                | Done                                                                   |
| 2 Shared admin layout       | Done (sidebar, header, breadcrumbs, user menu, notification panel shell) |
| 3 Authentication foundation | Done structurally; **not connected to a backend**                      |
| 4 Dashboard foundation      | Done as shell (API integration point exists) |
| Phase 2 Admin UI & Dashboard | Done: collapsible grouped sidebar, header with title/breadcrumbs/avatar, dashboard with **sample data** (clearly labelled) |
| 5 Module scaffolding        | Done: all 19 modules have routes, pages, service stub, types file      |
| 6 Verification              | Done: `tsc`, `eslint`, `vitest` (5 tests), `vite build` pass; every route rendered in browser |

## Modules

Implemented beyond placeholder: Authentication UI (forms/validation), Profile (session data only), Dashboard shell.
**Placeholder only (not implemented):** every other module (A-U in the brief).

## API dependencies (all pending)

Auth (login, logout, current user, forgot/reset/change password, token refresh), dashboard summary, and every module's list/detail/mutation endpoints, status values, workflow transitions, pagination format, error format, upload/download (signed URL) policy.

## Missing specifications

- **Coral Swift backend API documentation** (not found). `~/Downloads/openapi.json` is for a different product ("SevaNest") and was not used.
- PRD (v3.0 consolidated) found at `~/Downloads/Coral_Swift_Complete_Consolidated_Master_PRD.pdf`; companion PDFs `CoralSwift_Complete_13_Dashboard_Workflow.pdf` and `coralswift_Dashboard_Module_Workflows_Block_Format.pdf` exist and were **not reviewed**: read them before implementing modules.
- Role-to-module permission matrix (current mapping is an assumption).
- Official logo master (current PNG is the raster from the public-site repo) and approved brand colours (PRD tokens are marked "proposed").

## Assumptions

- PRD proposed palette used as tokens; `coral-ink` (#C4301C) is a derived darker coral for AA text contrast.
- Strategic/M&A restricted to Super Administrator; BDM gets no partner modules; Partner Reviewer gets applications, reviews, documents, partners (read), notifications. Unconfirmed.
- Reset-token query param `?token=` and password min length 8 are placeholders.
- shadcn/ui: components are hand-written in shadcn style (Radix + CVA); the CLI was not run, so `components.json` is absent.

## Known issues

- Session is memory-only: a page reload signs the user out (by design until the auth mechanism is known).
- Main JS chunk ~710 kB (Recharts in dashboard chunk is separate); split further if needed.
- Dark mode, i18n, and automated accessibility audits not done. Mobile drawer navigation was built but only desktop width was inspected visually.

## Next tasks

1. Obtain the backend API spec; fill `config/endpoints.ts`; wire real login + `/me`.
2. Review the two workflow PDFs; confirm role matrix.
3. Implement **Partner Applications** (list, filters, detail) next, then Application Review, since they drive the partner pipeline.

## Phase 2 (Admin Console UI & Dashboard)

- **Created:** `UserAvatar`, `FilterDropdown` (native select), `ChartCard` in `components/common/`; `KpiCard` renamed `StatCard`. Sidebar rewritten with expandable groups (auto-opens the active group, icon rail when collapsed, drawer on mobile). Header: toggle (collapses on desktop, opens drawer below `lg`), page title, breadcrumbs, notifications, profile menu with name/email/role and logout.
- **Dashboard:** 8 stat cards, 4 Recharts charts, recent applications table (status filter), pending actions, recent enquiries/decisions/onboarding, date-range filter. All values come from `src/features/dashboard/mock/dashboardMock.ts` and the page shows a "Sample data" notice. `dashboardService` is unchanged and unused by the page.
- **Navigation:** group icons added; labels aligned to the brief. Pre-existing extra items kept (Notification Templates, Content Approval, five report pages, Profile/Change Password).
- **Dependencies added:** none.
- **Verification:** `tsc -b`, `eslint`, `vitest` (5 pass), `vite build` pass. No browser/visual check was done this phase (no screenshots by request); responsive behaviour is unverified visually.

## Phase 2 known limitations

- Date-range filter only re-buckets sample trend data; the status filter only affects the recent-applications table.
- Notification panel still an empty state (no API).
- Reports & Analytics is a group of five pages, not a single page.
- Dashboard chunk ~427 kB (Recharts).

## Phase 3 (Admin authentication & access control)

- **Backend verified** via `/openapi.json` (details in README). Real endpoints wired: login, refresh, logout, me, MFA enroll/confirm/verify, password-reset request/confirm. Base URL via `VITE_API_BASE_URL` in `.env` / `.env.example`.
- **Built:** login page (logo, show/hide password, validation, loading, API errors), MFA verify/enroll steps with recovery codes, session init through `/auth/me`, single-flight token refresh, logout that revokes the server session, post-login return to the intended page, role mapping from `staff_role`. Dev fixture bypass (`VITE_DEV_BYPASS_AUTH`) removed from code (`src/dev-fixtures/devSession.ts` is now unused and can be deleted).
- **Tested against the real backend:** login 401 (wrong credentials) shown in the UI via the dev proxy; unauthenticated redirect to `/login`; form validation. **NOT tested:** successful login, MFA, `/me`, refresh, logout, role-based navigation with a real account (no credentials available). `tsc`, `eslint`, `vitest` (6) and `vite build` pass.
- **Findings:** backend CORS rejects `localhost` and `coralswift.com` origins (preflight 400), so browser calls need a dev proxy and the deployed origin must be allowlisted. `/auth/me` is not restricted to staff, so the console rejects partner accounts client-side (backend still enforces per-endpoint).
- **Pending:** role->module matrix confirmation, change-password endpoint, accept-invitation page, persistent sessions (needs cookie refresh), dashboard wired to `/admin/overview`.

## Phase 4 (Admin dashboard, backend-connected)
- **Endpoints (verified in openapi.json, all require a Bearer token):** `GET /api/v1/admin/overview` and `/admin/reports/kpis` (untyped `dict`; rendered as generic counters from numeric keys the backend returns, `kpis` takes `created_from/created_to`), `GET /api/v1/admin/enquiries` (EnquiryRow, `created_from/to`), `GET /api/v1/admin/organizations?status=active`, `GET /api/v1/reviewer/applications` (ReviewerApplicationOut; no date filter, so the date range is applied client-side on `submitted_at`).
- **Metrics:** Total applications = rows returned; Rejected = status `rejected`; Active partners = active organizations; Pending onboarding = status `pilot_onboarding`; Open enquiries = status != `closed`; Pending follow-ups = open enquiries with `next_follow_up_at`. Charts: application trend (`submitted_at`), enquiry trend (`created_at`), status distribution and onboarding stages (PortalStatus counts). Recent applications/enquiries; pending actions link to modules.
- **Role gating:** each query is enabled only if the role can access the related module (BD manager: enquiries/reports; reviewer: applications/partners); other cards show "Not available for your role".
- **Pending backend support:** Pending / Approved application counts (PortalStatus has no pending/approved value; ReviewStatus is per-document), Recent decisions (no decision timestamp on list), Recent onboarding activities (no feed), Documents awaiting verification (no cross-application endpoint). The exact keys of `overview`/`kpis` are not in the spec.
- **Limitations:** totals are computed from one page of up to 100 rows (list meta shape is undocumented); a note shows when a list hits 100.
- **Components:** `features/dashboard/{types,services,utils,hooks,components/widgets.tsx,pages}`; `StatCard` gained `loading`/`error`.
- **Testing:** lint, `tsc -b`, production build and 10 vitest tests pass (transform unit tests + page render test with mocked service). **NOT tested against the live API or in a browser with a session**: no staff credentials/MFA were available, so only the unauthenticated 401 on `/admin/overview` was confirmed live. Live response shapes, the date filter against the real server, and responsive layout remain to be verified.

## Phase 5 (Partner Applications Management)
- **Pages:** `/admin/applications` (list) and `/admin/applications/:id` (detail) in `features/partner-applications/{pages,components,hooks,services,schemas,types,utils}`. Replaces the placeholders. Reuses `DataTable`, `Pagination`, `SearchInput`, `FilterDropdown`, `ConfirmDialog`, `StatusBadge`, dialogs, React Hook Form + Zod, TanStack Query.
- **Verified endpoints (openapi.json, Bearer required; unauthenticated list returns 401 live):** `GET /api/v1/reviewer/applications` (`status`, `unassigned`, `page`, `page_size<=100`), `GET .../{id}` (ReviewDetailOut: application, organization, documents, eligibility_verifications, status_history, open_information_requests), `POST .../{id}/assign` `{reviewer_id}`, `POST .../{id}/transition` `{to_status, reason?, partner_note?}`, `POST .../{id}/information-requests` `{body, requested_categories[<=8]}`, `GET|POST .../{id}/notes`, `GET .../{id}/messages`, `GET .../{id}/history` (audit), `POST .../{id}/documents/{doc}/review` `{status, comment?, version_no?}`, `GET .../{id}/documents/{doc}/download` (blob via authenticated Axios, opened from an object URL, never stored), `GET /api/v1/admin/users?role=partner_reviewer` (super administrator only; used for reviewer names and the assign picker).
- **Statuses (PortalStatus):** draft, submitted, eligibility_verification, capability_review, commercial_legal_review, pilot_onboarding, scale_up, information_requested, rejected, withdrawn. There is **no "approved"** status; the backend has no transition table, so the stage form offers eligibility_verification, capability_review, commercial_legal_review, pilot_onboarding, scale_up, rejected (frontend choice) and shows the backend's error when a move is refused. rejected/pilot_onboarding/scale_up ask for confirmation. Moving a stage never creates a partner account.
- **Pending backend requirements:** list search (`q`), date range, sort and category filters; list pagination `meta` shape (UI uses `pages`/`total` if present, else infers from a full page); applicant name/email/phone and "last updated" on list rows (contact data only inside untyped `authorized_contacts`); reviewer-name lookup for non-super-admin roles; the transition table / allowed-next-stages; endpoint to record eligibility verification is available (`POST .../eligibility-verifications`) but no UI yet; business category = `organization.service_categories`.
- **Client-side only (current page of 20):** search (reference/organization), submitted-date range, sorting. Labelled in the UI.
- **Testing:** `eslint`, `tsc -b`, `vitest` (13) and `vite build` pass. **NOT tested against authenticated API or in a browser session** (no staff credentials/MFA): list/detail rendering with real data, actions, document download and role restrictions are unverified live.

## Phase 6 (Application Review & Decision Management)
- **Built:** review queue `/admin/application-reviews` and review workspace `/admin/application-reviews/:id` (`features/application-review/{pages,utils}`), tabs: Overview (applicant, organization, business, service categories as partnership interests), Documents, Checklist, Notes & requests, Decision & history. The Phase 5 detail page, hooks, service, schemas and `ReviewActions` are **reused** (not duplicated); the Phase 5 detail page links to the workspace. Phase 5 changes: `Section/Fields/Records/Documents` exported; new "Record eligibility" dialog; decision stages now require a reason (backend: "required for decisions"); stage changes are hidden for `rejected`/`withdrawn`.
- **Verified endpoints (openapi.json, 2026-11-09):** all Phase 5 reviewer endpoints plus `POST/GET /api/v1/reviewer/applications/{id}/eligibility-verifications` (`outcome` in verified | verified_with_exception | not_verified | inconclusive; optional verified_operating_years, verified_personnel, verified_turnover_inr_crore, exception_note, notes; typed by the human reviewer, nothing computed).
- **Action mapping:** start review / recommend / approve / reject = `POST .../transition` (`to_status`, `reason` required for decisions, `partner_note`); request information = `POST .../information-requests`; notes = `POST .../notes`; assign/reassign = `POST .../assign` (reviewer list super-admin only). Every consequential action validates (Zod), confirms (decisions, eligibility), shows loading, toasts the backend message and invalidates `['applications']`.
- **Checklist:** read-only, derived from returned data (assignment, contact/organization/business fields present, eligibility recorded for current submission, each of 8 document categories accepted, no open information requests). Presence only; no scoring.
- **Decision section:** derived from `status_history` entries to `rejected`/`pilot_onboarding`/`scale_up` (date, actor id, reason, partner note) plus full history and audit trail. There is no "approved" status; Phase 5's decision mapping is kept. Account provisioning is never triggered here; a notice points to Approved Applicants/onboarding.
- **Pending backend requirements (not invented):** checklist/scoring endpoints and persistence; a dedicated start-review, recommendation and decision endpoint with a transition table; reversal/reconsideration process (UI treats `rejected`/`withdrawn` as final); actor names on history/notes (only ids returned); reviewer lookup for non-super-admins; "last updated" on the application; free-text/date list filters.
- **Testing:** `tsc -b`, `eslint`, `vitest` (15, incl. checklist/decision derivation) and `vite build` pass. **Not verified:** workspace rendering, actions and role restrictions against the authenticated API or in a browser (no staff credentials/MFA); responsive layout not inspected visually.

## Phase 7 (Partner Onboarding & Account Provisioning)
Done: Approved Applicants list (search, stage filter, date range, sort, client paging), Onboarding dashboard (counts, distribution, recent activity, pending actions), Onboarding Workspace (sections A–E, stage tracker, document checklist, reused document review/download, audit trail), provisioning panel (confirm dialog, blockers, 409 surfaced verbatim).
Verified endpoints (openapi.json, 2026-11-09): `GET /reviewer/applications`, `GET /reviewer/applications/{id}`, `POST .../transition`, `POST .../documents/{doc}/review`, `GET .../documents/{doc}/download`, `GET .../history|notes|messages`, `POST /reviewer/invitations`, `POST /auth/invitations/accept`. Unauthenticated probes of the first and the invitation endpoint returned 401 (live).
Document requirements: the backend does not say which categories are mandatory; provisioning is disabled in the UI until every submitted document is `accepted` (UX guard, backend authoritative).
Pending backend: onboarding records/initiation/progress/required-information/completion endpoints; read endpoint for invitation/account state (so "pending provisioning" cannot be counted and duplicate prevention relies on backend 409); applicant name/email/phone/category/approval date/last-updated on the list response; list filters (search, dates).
Testing: `tsc -b`, eslint, vitest (18 passing, incl. new onboarding derive tests) and production build pass. NOT tested against live authenticated backend (no staff credentials used); invitation sending and document review were not exercised end to end.

## Phase 8 (Business & Project Enquiry Management)
- **Built** in `features/business-enquiries/{pages,components,hooks,services,schemas,types,utils}`: Overview `/admin/enquiries/overview`, list `/admin/enquiries` (+ `/project`, `/general` scopes → `type` param), detail workspace `/admin/enquiries/:id` (sections A–E). One backend resource (`/admin/enquiries`) serves all enquiry types; no duplicated systems. Reuses `DataTable`, `Pagination`, `FilterDropdown`, `FormDialog`/`ConfirmDialog`, `Section/Fields`, `humanize/formatDate/pageCount`.
- **Verified endpoints (openapi.json, 2026-11-09, Bearer; unauthenticated GET list/detail returned 401 live):** `GET /api/v1/admin/enquiries` (`page,page_size,type,status,priority,assigned_user_id,unassigned,overdue,sla_breached,q,created_from,created_to`), `GET|PATCH /admin/enquiries/{id}` (PATCH `{status?, priority?}`), `POST .../assign` `{user_id|null}`, `POST .../follow-ups` `{note<=4000, due_at?}` (201), `POST .../follow-ups/{fid}/complete`, `GET .../documents/{doc}/download` (audited, blob), `GET /admin/users?role=` (super administrator only).
- **Categories/statuses (backend enums):** type general|project|partner|strategic|meeting; status received|in_review|closed; priority low|normal|high. Project categories (13) in `ProjectEnquiryIn`; IT vs Non-IT is derived per the PRD service list from `details.project_category` when the backend returns it (no IT/Non-IT field exists).
- **Action mapping:** assign/reassign/unassign = assign; update status/priority and close = PATCH (confirm on close); internal note / discussion = follow-up without due date; follow-up task = follow-up with `due_at`; complete = complete endpoint. No transition rules are enforced client-side; the backend decides and its message is toasted. Every mutation invalidates `['enquiries']` and `['dash']`.
- **Pending backend requirements (not invented):** list fields phone, project category/type, last-updated, assignee name; list filter by project category/IT-Non-IT; sort parameter; list pagination `meta` shape/total; typed `contact/company/details/documents` objects (document id/filename keys are assumed `id` + a filename key); enquiry activity/audit and assignment-history endpoints (assignment date, status-change history); separate internal-note vs follow-up vs communication types; assignee lookup for non-super-administrators (they can assign to themselves or clear); status workflow/transition table; "Open", "Awaiting response", "Completed" statuses do not exist.
- **Limitations:** overview counts come from the latest 100 rows (plus a 100-row SLA query); list sorting is per page. Partner and strategic types appear in "All" and the type filter (strategic remains confidential: backend enforces access).
- **Testing:** `tsc -b`, eslint, vitest (20, incl. new `utils/format.test.ts`) and production build pass. **NOT tested** against the authenticated API or in a browser session (no staff credentials/MFA): list/detail rendering with real payloads, assignment, status updates, follow-ups, attachment download, permission restrictions and responsive layouts are unverified live.

## Phase 9 (Strategic / M&A Enquiry Management)
- **Finding:** the backend has **no strategic-specific admin API**. `POST /api/v1/enquiries/strategic` is submission only and its OpenAPI description says "No endpoint reads or lists strategic records; staff access is Phase 3." Strategic records are `type=strategic` rows of the single `/api/v1/admin/enquiries` resource, so this module reuses Phase 8's service, hooks, schemas and dialogs (no duplicate system, no invented endpoint). Whether the backend actually returns/permits strategic rows to staff is **unverified** (no staff credentials); the UI shows the backend's message and an "Access denied" state on 403.
- **Built:** `features/strategic-enquiries/{pages,components,utils}`: overview `/admin/strategic-enquiries/overview`, list `/admin/strategic-enquiries` (Phase 8 `EnquiriesPage` with new `scope="strategic"`: server search, status, priority, assignment, attention and date filters; per-page sort; pagination), detail workspace `/admin/strategic-enquiries/:id` (A organization, B contact, C strategic information + restricted attachments, D management, E notes/discussions/follow-ups). Phase 8 changes: `EnquiriesPage` scope + link base, `EnquiryActions` optional `module` prop, `Attachments`/`FollowUps` exported. Placeholder service/types removed.
- **Verified endpoints (openapi.json, 2026-11-10; Bearer):** `GET /api/v1/admin/enquiries?type=strategic` (+ `status, priority, assigned_user_id, unassigned, overdue, q, created_from/to, page, page_size`), `GET|PATCH /admin/enquiries/{id}` (`{status?, priority?}`), `POST .../assign` `{user_id|null}`, `POST .../follow-ups` `{note, due_at?}`, `POST .../follow-ups/{fid}/complete`, `GET .../documents/{doc}/download` (audited blob), `GET /admin/users?role=` (super administrator only).
- **Statuses:** received, in_review, closed (priority low|normal|high). Dashboard mapping: New=received, Under assessment=in_review, Completed=closed, Pending follow-ups=open with `next_follow_up_at`. No transition rules enforced client-side; backend decides. Closing asks for confirmation.
- **Actions:** assign/reassign, update status/priority, close, add internal note or discussion (follow-up without due date), schedule follow-up (with due date), complete follow-up, attachment download.
- **Access:** nav/route module `strategicEnquiries` = Super Administrator only (unconfirmed PRD-derived hint, see Phase 2/3 notes); confidentiality banner + badge on all pages; attachments fetched with auth as blobs from an object URL, never stored; ids only in URLs (no business content in URLs/logs); 403 shows Access denied. Backend authorization is authoritative.
- **Pending backend requirements (not invented):** documented read/list access for strategic enquiries to staff; strategic category (`discussion_type`) on list rows + filter; dedicated internal-note vs discussion vs follow-up types with visibility restriction; assessment-outcome/decision endpoint and "active discussion"/"awaiting decision" statuses; activity/audit history (status changes, assignment, decisions); assignee names and last-updated on rows; sort param and list total; typed `contact/company/details/documents`; status transition table.
- **Testing:** `tsc -b`, eslint, vitest (22, incl. new `strategic.test.ts`) and production build pass. **NOT tested** against the authenticated API or in a browser (no staff credentials/MFA): list/detail with real payloads, actions, attachment access, 403 behavior, responsive layout and Phases 1–8 regression beyond automated tests are unverified live.

## Phase 10 (Lead Assignment Management)
- Route `/admin/lead-assignment` (module `leadAssignment`: super administrator, BD manager). Replaces the placeholder.
- Dashboard: total / assigned / unassigned / assigned-to-me / overdue per category from the backend `meta.total` of `page_size=1` queries (exact, not from partial pages). A missing total shows "—" and is listed as excluded.
- Workspace: four separate categories (Partner Applications; Business = `type=general`; Project = `type=project`; Strategic = `type=strategic`), server-side filters, assign/reassign via the existing Phase 5 and Phase 8/9 dialogs (now exported; reassigning an owned record asks for confirmation).
- Workload view: tallied from the newest 100 records per category; coverage limitation shown on screen.
- Tests added: `utils/assignment.test.ts`, `pages/LeadAssignmentPage.test.tsx`. Typecheck, ESLint, Vitest (38 tests) and production build pass (run 2026-11-10).
- Not verified against the live API (no credentials): the `meta` pagination keys (`total`/`total_count`), and 403 behavior per role. Manual testing with real BD manager and super administrator accounts is still required.

## Phase 10 known limitations / backend dependencies
- No assignment-history endpoint (enquiry detail has follow-ups only; application `/history` is status transitions, not owners). Not implemented.
- No workload/aggregate endpoint and no capacity rules: workload is a sample (newest 100 per category).
- `/reviewer/applications` has no owner, search, priority or date filter; only `status` and `unassigned`. Applications have no priority, contact or follow-up fields.
- Application assignment cannot be cleared (`reviewer_id` is required). Enquiry assignment can (`user_id: null`).
- Staff list (`GET /admin/users`) is super administrator only: other roles see only "Me"/short ids and cannot pick other assignees for enquiries beyond themselves.
- No "last updated" field on either list response. Enquiry types `partner` and `meeting` are not part of this module (no confirmed assignment workflow decision).
- No "any assigned" filter in the enquiry API; use Unassigned or a specific administrator.

## Phase 11 (Discussions & Follow-ups Management)
- Routes: `/admin/discussions` (module `discussions`) and `/admin/follow-ups` (module `followUps`); both replace placeholders. Code in `features/follow-ups/{utils,services,hooks,components,pages}` and `features/discussions/{components,pages}`. Reuses Phase 5/8 services, hooks, `FollowUpDialog` and `NoteDialog` (now exported); no new endpoints.
- **Verified endpoints (live openapi.json, 2026-11-10):** `GET /admin/enquiries` (+ `type,status,overdue,unassigned,assigned_user_id,q,page,page_size`), `GET /admin/enquiries/{id}` (embeds `follow_ups[]`), `POST /admin/enquiries/{id}/follow-ups` `{note<=4000, due_at?}`, `POST .../follow-ups/{fid}/complete`; `GET|POST /reviewer/applications/{id}/notes` (internal), `GET .../messages` (partner-facing), `GET /reviewer/applications?status=information_requested`.
- **Discussions:** counts via `meta.total` of `page_size=1` queries (enquiry records, open = received+in_review, overdue, applications awaiting partner reply). Record list per type (enquiry types / Partner Applications tab), thread panel: enquiry = contact's original message (inbound) + internal notes/follow-ups; application = internal notes and partner-facing messages kept in separate columns. Add internal note/follow-up supported.
- **Follow-ups:** date-grouped list of enquiries with `next_follow_up_at`; views Upcoming/Overdue (server `overdue`)/All; owner (me/unassigned), record type, search server-side; due-date range client-side on the loaded page (50 rows). Per record: view all follow-ups, create, complete (confirmation).
- **Internal vs external:** every enquiry follow-up/note is labelled "Internal"; nothing is presented as sent. Strategic: confidentiality banner in its thread, record/filter hidden without `strategicEnquiries`, links go to the strategic workspace; backend 403 messages are shown. No discussion content is persisted client-side (React Query memory only).
- **Missing backend capabilities (not invented):** global follow-up/discussion list; follow-up update/reschedule/reassign/cancel; follow-up status field or assignee (owner = enquiry assignee); follow-up date filter and count (upcoming, completed); last-updated/last-activity; enquiry reply/external message endpoint; reviewer-side message POST (info requests only, in Phase 6); follow-up notifications (`/admin/notifications` is an outbox of failed deliveries, not follow-up events); applications have no follow-ups.
- **Calendar:** not built. Only one date per enquiry (`next_follow_up_at`) is exposed, so day/week/month views would be incomplete; a date-grouped list is used instead.
- Testing: `tsc -b`, eslint, vitest (51 tests, +13) and production build pass. **NOT tested** against the authenticated API or in a browser (no staff credentials). Manual testing needed: real BD manager and super administrator accounts, strategic 403 behavior, creating/completing follow-ups, application notes, responsive layouts.

## Phase 12 (Document Management Enhancements)
Implemented: `/admin/documents` (application picker, status filter, server pagination), `/admin/documents/:appId` (accurate per-application counts, category/status/text filters, missing categories using the Phase 6 `PartnerDocCategory` list), `/admin/documents/:appId/:docId` (metadata, preview/download, Accept, Reject with reason, Request replacement with reason, application notes, document-referencing audit entries). Tests: `utils/documents.test.ts`, `pages/DocumentsPage.test.tsx`.

Verified endpoints (openapi.json, 2026-11-10): `GET /api/v1/reviewer/applications[/{id}]`, `POST .../{id}/documents/{doc}/review` (`status` pending|accepted|rejected|clarification_needed, `comment`, `version_no`), `GET .../{id}/documents/{doc}/download?version=`, `GET/POST .../{id}/notes`, `GET .../{id}/history`. Categories: registration_proof, operating_history, employee_strength, financial_statements, service_portfolio, infrastructure_summary, client_references, authorized_contact.

Review actions: Accept → `accepted`; Reject → `rejected` (reason required); Request replacement → `clarification_needed` (reason required; the backend has no separate replacement-request status).

Security: authenticated client only, no public routes, blob URLs tracked and revoked (60s after preview, 1s after download, on unmount), nothing persisted or logged, preview allow-list PDF/PNG/JPEG, 401/403/404/409 mapped to clear messages, role gating via `documents` / `applicationReviews` modules, backend remains the authority.

Backend dependencies / limitations:
- No admin document list/search/filter endpoint → global metrics (total, pending, accepted, rejected, replacement, missing, recent), reviewer/organization/upload-date filters and cross-record listing are unavailable.
- Per-document review history is partner-only (`/partner/documents/{id}/history`); staff see current-version status and audit entries whose `meta.document_id` matches.
- Upload, replace and delete are partner-only endpoints; the admin console does not upload or delete.
- Enquiry attachments have no list endpoint (only download via enquiry detail) and are not centralised; strategic attachments remain restricted to Phase 9 screens.
- Onboarding has no document endpoints of its own.
- Notes are application-level, not document-level.

Manual testing still required against the live backend: real download (content-type/headers, 403/404/409), review transitions and partner-visible comments, preview in new tab, role boundaries for reviewers vs. super admin, mobile layout.

## Phase 13 – Partner Management

Built: `/admin/partners` (metrics + directory) and `/admin/partners/:id` (profile tabs: Overview, Business, Partnership, Onboarding & records) in `features/partner-management/{pages,hooks,services,utils,schemas,types}`. Placeholders removed. A **partner is the backend `organization`**; applicants (`reviewer/applications`) stay separate and are never counted as partners.

Verified endpoints (openapi.json, fetched 2026-11-10): `GET /api/v1/admin/organizations` (`q`≤100, `status=active|suspended`, `page`, `page_size≤100` → `OrgRow{id,legal_name,status,country,created_at,open_application_status}`), `GET /api/v1/admin/organizations/{id}` (untyped dict: profile + applications, financial data super-admin only), `POST /api/v1/admin/organizations/{id}/status` `{status: active|suspended, reason 1..4000}` (super administrator).

Statuses: only `active` / `suspended` (partnership). Transitions: active→suspended, suspended→active, with a mandatory reason and confirmation dialog; action shown to super administrators only. Application stage is the separate `open_application_status` (PortalStatus); onboarding stages (`pilot_onboarding`, `scale_up`) are never treated as account activation, and account provisioning/activation is shown as "not exposed by backend". No accounts are created and no passwords handled.

Directory: server-side search (`q`), status, pagination. Country, created-date range and sort refine the **loaded page only** (labelled in the UI). Metrics (total/active/suspended) use list `meta.total` from 1-row queries and show "—" if the backend omits it; "Applications in onboarding" counts applications at `pilot_onboarding` (reviewer API `meta.total`), labelled as applications.

Profile: reads only keys shared with `Organization` (all optional, tolerant of root or `organization` nesting); applications link to Phase 5/6/12 screens (Application, Review, Documents) when the role can access them. Documents/review stay in Phase 12 (no duplication).

Backend dependencies / limitations: no partner edit endpoint for staff (partner `PUT /partner/organization` is partner-only; `admin/profile-change-requests` exists but is not wired here); no partner category/type, contact person/email/phone columns on `OrgRow`; no location filter, date filter, sort or category filter server-side; no org-level activity history, agreements, relationship manager, performance metrics, "recently onboarded" or per-category counts; detail response shape is untyped, so the Business/Partnership tabs show only fields actually returned; list `meta` shape undocumented.

Tests: `utils/partners.test.ts` (totals, transitions, lifecycle distinction, filters/sort, detail parsing, reason schema), `pages/PartnerPages.test.tsx` (rows, empty/error, super-admin-only suspend, 403). Results: typecheck, lint, 74 Vitest tests and production build all pass.

Manual testing still required against the live backend: real list/detail payload keys and `meta`, suspend/reactivate (reason persisted, 403 for non-super-admin, 409), financial-field visibility by role, mobile layout.

## Phase 14 – Partner Account Management

**Finding (openapi.json fetched 2026-11-10): the backend has no partner-account management API.** Only these account operations exist, and only these are implemented:
- Provision = `POST /api/v1/reviewer/invitations` (`email, full_name, organization_id | new_organization_legal_name, source_enquiry_reference`; super administrator only; 201 `{organization_id}`; 409/404/403/401/422). Invitation-only, no self-registration. The console sends only `organization_id` of an existing partner (never `new_organization_legal_name`, to avoid duplicate partner profiles) via the Phase 7 `ProvisioningPanel` (confirmation, onboarding-stage + accepted-documents blockers, 409 shown verbatim).
- Activation = `POST /auth/invitations/accept` (partner-side `token`+`password`; the console never sees tokens or passwords). Password reset = partner self-service only.
- Activity = `GET /api/v1/admin/audit?organization_id=` (super administrator): shown as backend-named events (action, record type, actor type/id, time); `meta` is not mapped or displayed.

Built: `/admin/partner-accounts` (organization list with server search/status/pagination, provisioning-stage indicator, six account metrics shown as **Unavailable**, backend-support matrix) and `/admin/partner-accounts/:id` (id = organization id: overview with "not exposed" fields, related application/onboarding/partner links, provisioning, activity). Provisioning is offered only to super administrators, for a non-suspended partner with an application at `pilot_onboarding`/`scale_up`. Approval/onboarding never creates an account.

Not available, not simulated (exact backend requirement): account list/search/detail (ids, holder, email, role, status, last login, created/updated); invitation status, expiry, resend; account deactivate/suspend/reactivate/revoke; partner roles and permissions; admin-initiated password reset; account-level history; filters for role/invitation/date; account metrics; read of "already has an account" (duplicate prevention relies on backend 409). `/admin/users*` is staff-only and is never used for partners.

Security: Bearer client only, route guarded by `partnerAccounts` (super administrator), backend authoritative, no tokens/passwords/PII stored or logged, audit `meta` dropped, 401/403/404 mapped.

Tests: `pages/PartnerAccounts.test.tsx` (stage gating, audit mapping without meta, capability matrix, unavailable metrics, error state, role gating, suspended/pre-onboarding blocks). Results (2026-11-10): `tsc -b`, ESLint, Vitest 82/82, production build all pass.
Manual testing required (no staff credentials/MFA used): real invitation send and 409/403 behavior, audit event names and `organization_id` filtering with real data, accepting an invitation as a partner, responsive layout.

## Phase 15 – Communication & Notifications

**Finding (openapi.json fetched 2026-11-10):** the backend has only an email outbox and template overrides. It has NO admin notification feed (list/read/unread/archive/delete), NO ad-hoc email send or attachments, NO preferences, NO communication history by record, NO delivered/opened receipts, NO template creation/activation/version history or placeholder list. None of these are simulated.

**Verified and used** (all Bearer; role enforced by backend, 401/403 messages surfaced):
- `GET /api/v1/admin/notifications?status=pending|sent|logged|failed&page&page_size≤100` (default `failed`; rows are untyped dicts; this is the *outbox*, not a feed).
- `POST /api/v1/admin/notifications/{id}/retry` (200, resets a failed email); `POST /api/v1/admin/notifications/dispatch` (202, retries eligible emails in the background; rows past the cap need /retry).
- `GET /api/v1/admin/notification-templates` (`TemplateOut{key,customised,version,subject,text_body,html_body}`), `PUT/DELETE .../{key}` (`TemplateIn{subject 1..200, text_body 1..20000, html_body ≤50000|null}`; delete = revert to built-in), `POST .../{key}/preview` (renders sample values, sends nothing).
- Partner invitation emails remain Phase 7/14 (`POST /reviewer/invitations`); application messages Phase 6; enquiry follow-ups Phase 11.

**Built** (`features/communication`): `/admin/communications` (total/sent/failed/pending/logged from `meta.total` of 1-row queries, "—" if absent; "delivered" and "unread notifications" shown as unavailable; capability matrix), `/admin/communications/delivery` (status filter + pagination server-side, text filter on loaded page, retry with confirmation, dispatch with confirmation), `/admin/communications/templates` (list, override/edit with zod validation, preview, revert with confirmation), and unavailable screens for `/admin/notifications`, `/admin/communications/emails`, `/admin/communications/preferences`.

**Delivery statuses:** pending, sent ("Sent (accepted)": provider accepted, not confirmed delivered), logged ("Logged only"), failed. Only failed rows offer retry.

**Confidentiality:** only whitelisted fields are read (id, type, recipient, subject, status, created_at, attempts, error); bodies/payloads are dropped. Rows whose type/subject match strategic/M&A/merger/acquisition are shown as "Restricted" (no recipient, subject or error) unless the role has `strategicEnquiries`. Heuristic: the backend marks no outbox row as strategic, so backend access control stays authoritative. Preview output is rendered as text, never as HTML.

**Not done (backend-blocked):** notification centre, email composer, preferences, per-record communication history on Phase 5–14 screens, date-range/type server filters, related-record links, template version history/placeholder list. Existing header `NotificationPanel` is still a shell.

**Tests/results (2026-11-10):** `tsc -b` clean, ESLint clean, Vitest 93/93 (+11 in `Communication.test.tsx`: mapping, redaction, status semantics, retry gating, filter, template validation, capability matrix, loading/empty/error, unavailable pages), production build passes (existing >500 kB chunk warning).

**Manual testing required** (no staff credentials used, not run in a browser): real outbox row keys (field names are guessed candidates: `type|template_key|template|kind|event`, `recipient|to|to_email|email`, `last_error|error|failure_reason`), `meta.total` presence, which roles get 403 on outbox/templates, retry/dispatch behavior, template save/preview with real placeholders and 422 messages, strategic-row redaction with real data, responsive layout.


## Phase 16 – Website Content Management (CMS)

**Finding (openapi.json fetched 2026-11-10, 115 paths):** the backend CMS is ONE resource, `content` (`content_type` article | faq | page | resource), plus a claims register and public read endpoints. There is NO page-tree, homepage/hero/banner, service, industry, media library, image upload/replace/delete, SEO metadata (title, description, canonical, Open Graph), navigation menu, scheduling, or approval/publication audit endpoint. None are simulated. The public website content is served by `GET /api/v1/content` (published only).

**Verified and used** (Bearer; role/permission enforced by backend, 401/403/404/409/422 messages surfaced):
- `GET /admin/content?status&type&q(<=100)&page&page_size<=100` -> `AdminContent[]`; `POST /admin/content` `ContentIn{slug 2..120 /^[a-z0-9]+(-[a-z0-9]+)*$/, content_type, title 1..200, summary<=500|null, body 1..100000, category<=80|null, tags<=15 (/^[a-z0-9-]+$/, <=40), claim_ids<=50}` -> 201.
- `GET|PATCH /admin/content/{id}` (`ContentUpdate`: no slug/type; draft only; each save stores a new version); `GET /admin/content/{id}/versions` (`version_no,title,summary,body,edited_by,created_at`).
- Workflow: `POST .../submit` (draft->in_review), `approve` (in_review->approved, super administrator, optional note), `reject` (-> draft, super administrator, note required <=4000), `publish` (approved->published), `unpublish`, `reopen` (-> draft, removes from site), `archive`.
- `POST .../attachment` (multipart `file`, `version_label<=40`; draft only; 413/415).
- `GET|POST /admin/content-claims`, `PATCH /admin/content-claims/{id}` (verification = super administrator; un-clearing pulls content offline). Statuses: verified, pending_verification, illustrative, prohibited.

**Built** (`features/content-management`): `/admin/website` (exact totals from `meta.total` of 1-row queries: all, published, draft, in review, approved, archived; capability matrix), `/admin/website/pages` (server search/status/type/pagination; title, slug, type, category, status, published date, version, owner id), `/admin/website/approval` (in_review queue), `/admin/website/pages/new` and `/:id` (reusable editor: zod validation with backend limits, plain-text body with preview, tags, linked claims, backend errors shown, unsaved-changes guard via `useBlocker` + `beforeunload`, read-only when not draft, workflow panel with confirmation dialogs and notes, attachment upload, version history), `/admin/website/claims` (list/filter/register; verify controls for super administrators), and "not available" screens for `/homepage`, `/services`, `/industries`, `/media`. Old `/admin/content/*` paths redirect.

**Not available, not simulated:** homepage/banners, services, industries, media library and image handling, SEO fields, navigation menus, scheduled publication, category filter and sorting (no params), "updated at/by", "unpublished" metric (no such status), total media assets, approval/publication audit history (versions only), rich-text/HTML (body is a plain string; rendered as text only).

**Permissions:** route guard `content` (existing, frontend hint). Approve/reject buttons shown only to `super_administrator` (stated in the endpoint summaries); every other action is offered and the backend decides (403 shown). No Content Administrator permissions invented.

**Tests/results (2026-11-10):** `tsc -b` clean, ESLint clean, Vitest 114/114 (+21 in `ContentManagement.test.tsx`: slug/form/tags validation, form<->API transformation, dirty detection, status mapping, transition + role gating, note rules, attachment validation, capability flags, list/empty/error/dashboard totals, editor read-only/unsaved/approve-confirmation/404), production build passes (existing >500 kB chunk warning).

**Manual testing required** (no staff credentials used, not run in a browser): real create/edit/submit/approve/publish/unpublish flows and 409/422 messages, which roles get 403 on each action, `meta.total` presence on `/admin/content`, attachment type/size limits and 413/415, claim verification, un-clearing a claim, public site reflecting a publish, responsive layout.


## Phase 17 – Admin Users & Roles Management

**Finding (openapi.json fetched 2026-11-10):** staff administration is five endpoints, all Bearer and Super Administrator only (backend-enforced). There is NO GET-by-id, search, pagination, profile update, permission matrix/editing, suspend/reactivate, password reset by admin, invitation list/resend, created/updated date, contact field or per-user activity endpoint. `status` is an untyped string; `StaffRole` = `super_administrator | business_development_manager | partner_reviewer | content_administrator` (spec note: only the first two were fully used in backend Phase 2).

**Verified and used:**
- `GET /admin/users?role=` -> `StaffOut[] {id, email, full_name, staff_role|null, status, mfa_enabled, last_login_at|null}` (unpaginated).
- `POST /admin/users` `StaffInviteIn {email, full_name 1..150, role}` -> 201 `StaffOut`; 409 duplicate, 422. Invitation only: the invitee sets their own password (`/auth/invitations/accept`) then enrols MFA. No password is generated, shown or stored.
- `POST /admin/users/{id}/role {role}`, `POST .../activate`, `POST .../deactivate` -> `StaffOut` (409/422 surfaced), `POST .../mfa-reset` (lost device; user re-enrols).
- `GET /admin/audit?actor_user_id=&page&page_size<=100` -> `AuditRow[]` for activity history.

**Built:** `/admin/users` (metrics from the complete list: total, active, not active, Super Administrators, counts by role/status; search, role/status filters, sort, pagination all client-side because the backend offers none; invite dialog with zod validation), `/admin/users/:id` (profile from the list row, role change, activate/deactivate, MFA reset, activity history, all behind confirmation dialogs), `/admin/roles` (4 backend roles, member counts, verified Super-Administrator-only restrictions, navigation hint clearly labelled as not a permission). Reuses the Phase 14 audit service/mapper (added `recordId`).

**Security:** routes guarded by existing `users`/`roles` modules (Super Administrator only); UI blocks self-deactivation, self-role-change and removing the last active Super Administrator (UX only, backend decides); Super Administrator grants/removals get an extra warning; no frontend-only permissions; 401 handled by Phase 3 interceptor, 403/404/409/422 messages shown.

**Not available, not simulated:** suspended/reactivate (no such transition; "Not active" covers any non-`active` status), permission editing, contact info, created/updated/last-activation dates, recently-created metric, date filters, server-side search/pagination, admin-initiated password reset, invitation status/resend, full per-user audit (only actions *by* the user plus changes found in the newest 100 audit rows).

**Tests/results (2026-11-10):** `tsc -b` clean, ESLint clean, Vitest 127/127 (+13 in `UserManagement.test.tsx`: role/status mapping, filter/sort, metrics, self-lockout and last-super-admin guard, privileged-change flag, invite/role-change validation, module access, list/403/detail/confirmation/404), production build passes (existing >500 kB chunk warning).

**Manual testing required** (no staff credentials used, not run in a browser): real `status` values and whether `deactivate`/`role` return 409 for self or last Super Administrator, whether invite emails arrive and `mfa-reset` behaves, audit action names for user events, list size at scale (client-side paging), responsive layout.

## Phase 18 – Reports & Analytics Management

**Verified and used (openapi.json, 2026-11-10):**
- Exact counts: `page_size=1` + `meta.total` on `GET /admin/enquiries` (type, status, overdue, unassigned, sla_breached, created_from/to), `/reviewer/applications` (status, unassigned), `/admin/organizations` (status), `/admin/notifications` (status).
- `GET /admin/reports/kpis` (untyped dict; numeric entries shown as reported, only to roles that can view Strategic/M&A).
- `GET /admin/reports/enquiries.csv` (same filters, audited, capped 10,000 rows) and `/admin/reports/applications.csv` (super administrator).

**Built:** `/admin/reports` and `/admin/reports/:section` (overview, applications, enquiries, strategic, partners, communications). URL-synced filters (date preset/custom range with validation and LOCAL-day boundaries, enquiry type, status, reset), KPI cards that drill down to existing record routes, donut/horizontal-bar/line charts with empty states, breakdown tables, metric-definition panels, server-side CSV export. The five placeholder `reports/<kind>` routes and nav items were replaced.

**Metric definitions:** totals = sum of exact backend counts (never rows on a page). Under review = eligibility_verification + capability_review + commercial_legal_review. Onboarding stages = pilot_onboarding + scale_up. Review outcomes = rejected / withdrawn / onward stages (no "approved" status exists). Overdue/unassigned/SLA = backend filters. General enquiry reports sum the non-strategic types only; strategic is a separate section.

**Partial data:** row-based charts (trends, assignee/reviewer workload, country, scheduled follow-ups) load up to 500 rows per list and show a "Partial dataset" notice when the backend total is larger.

**Access control:** sections gated by existing modules (UI hint only; backend authoritative). Strategic/M&A is never queried or listed without `strategicEnquiries`, contains aggregates only, and is excluded from general enquiry reports/exports. "All types" export is disabled for the general section (a specific type must be chosen).

**Not available, not simulated:** date filter on applications/partners/outbox lists (range shown as not applicable), assignee and category filters, IT/Non-IT split, review turnaround, onboarding progress/duration/document completion, partner-account metrics, completed follow-ups and follow-up trends, document-review and communication-history reports, PDF/Excel export, assignee names (IDs shown; staff list is super-admin only). CSV titles/generation date are only in the filename (backend generates content).

**Tests/results (2026-11-10):** `tsc -b` clean, ESLint clean, Vitest 139/139 (+12: range/timezone boundaries, day bucketing, grouping, partial-fetch flag, strategic confidentiality, unavailable-not-zero, exact totals), production build passes (existing >500 kB chunk warning). **Not verified against the live backend with credentials**; export and role behaviour need manual testing.


## Phase 19 – Audit Logs & System Settings Management

**Finding (openapi.json, 2026-11-10):** the backend has exactly one audit endpoint and three settings endpoints, all Bearer and Super Administrator only. There is NO get-audit-by-id, text search, sort, total-count guarantee, outcome/status, IP/device, before/after fields, event-type catalogue, audit export, settings categories, typed settings schema, secrets API, security-policy API, or per-category settings. Nothing below is simulated.

**Verified and used:**
- `GET /admin/audit?record_type(<=50)&action(<=80)&actor_user_id&organization_id&created_from&created_to&page&page_size<=100` -> `AuditRow[] {id, record_type, record_id, action, actor_type, actor_user_id|null, organization_id|null, request_id|null, meta{}, created_at}`. Read-only (no write verbs exist).
- `GET /admin/settings` (untyped dict: "stored settings and the keys that can be set"), `PUT /admin/settings/{key}` body `{value: string 1..200}` (no extra fields), `DELETE /admin/settings/{key}`.

**Built:**
- `/admin/audit-logs`: totals from `meta.total` of 1-row queries (all time, today since local midnight; "—" if `meta.total` is absent), by-administrator and by-module breakdowns (labelled as based on the latest 100 events), server filters (administrator, module = `record_type`, action, local-day date range with inverted-range validation), client-side search of the loaded page, pagination, 403/error/empty/loading states. Actor ids are resolved to names via the staff list.
- `/admin/audit-logs/:id`: event, actor and metadata cards. Because there is no get-by-id, the already-sanitised event is passed from the list via router state; a cold open shows "Event not loaded" instead of fabricating it. No edit/delete controls exist.
- `/admin/system-settings`: key/value list with search, edit/set (React Hook Form + Zod = `SettingIn`; two-step Review change -> Confirm and save showing current vs proposed), remove (destructive confirmation), success toast only after backend acceptance, refetch of settings + audit data afterwards. `/admin/system-settings/security`: honest "not configurable through the API" screen. `/admin/settings` redirects.

**Security:** `meta` values under password/token/secret/key-like names are redacted recursively before they reach state or the DOM. Settings with credential-like keys are masked, never prefilled and excluded from search; they are entered in a password field. Rows matching strategic/M&A are withheld (action, record, org, metadata) unless the role has `strategicEnquiries` (heuristic; backend marks nothing as strategic). Modules `auditLogs`/`settings` map to Super Administrator only; this is a UI hint, backend 403 is shown as a permission-denied state.

**Not available (backend dependencies):** audit outcome/IP/device/before-after, event-type catalogue, server text search, sort, get-by-id, export, security-event classification ("recent security events" metric omitted), settings categories/types/descriptions/defaults, general/notification/communication/website/security settings screens, MFA/password/session policy, "Activity History" nav (covered by the actor filter).

**Unverified assumption:** the shape of `GET /admin/settings` is not in the spec. `normalizeSettings` accepts `{stored|settings|values|current: {...}, keys|available_keys|allowed_keys|settable_keys|settable|available: [...]}` or a flat map, and otherwise shows the response's field names. Confirm with real data. Also unverified: `meta.total` on `/admin/audit`, audit `action`/`record_type` values and filter matching (exact vs partial), `meta` contents.

**Tests/results (2026-11-10):** `tsc -b` clean, ESLint clean, Vitest 153/153 (+14 in `AuditSettings.test.tsx`: redaction, strategic withholding, search/count/date bounds, list/filter call, inverted range, 403, read-only detail, cold-open detail, settings normalisation, masking, schema, role hint, review-before-save and failed save, 403), production build passes (existing >500 kB chunk warning). **Not run against the live backend** (no staff credentials used); manual testing required for all of the above, plus responsive layout.

## Phase 20 – Integration, testing & production readiness

- **Gaps found:** (1) `.env.local` (empty `VITE_API_BASE_URL` for the dev proxy) was also read by `vite build`, so local production bundles contained no backend URL; fixed by moving it to `.env.development.local`, adding `.env.production`, and failing production builds without an https URL. (2) No SPA fallback file; added `public/_redirects`. (3) Unused `src/dev-fixtures` removed. (4) No router/guard tests; added `src/app/router.test.tsx` (6 tests: no dead nav links, 404 fallthrough, unique nav paths, unauthenticated redirect, strategic denied to non-super roles, allowed for super admin).
- **Results (2026-11-10):** `tsc -b` clean, ESLint clean, Vitest 159/159, production build passes (main chunk ~690 kB / 219 kB gzip; route pages are lazy). Details and limits: `PRODUCTION_READINESS_REPORT.md`.
- **Not done:** live-backend and browser verification (no staff credentials/MFA), responsive visual QA, Playwright E2E (not installed; not added).

## Phase 21 – Admin Console PRD gap closure & acceptance validation

- **PRD source:** found (`Downloads\Coral_Swift_Complete_Consolidated_Master_PRD.pdf`, read in full). Backend OpenAPI re-fetched 2026-11-10: unchanged since Phase 17.
- **Audit:** 77 traceability rows → 43 Completed, 17 Partial, 3 Missing, 11 Blocked, 2 N/A, 1 Not verified (see `ADMIN_CONSOLE_PRD_TRACEABILITY.md`, `ADMIN_CONSOLE_GAP_REPORT.md`, `ADMIN_CONSOLE_ACCEPTANCE_REPORT.md`).
- **Built:** `features/governance` + route `/admin/governance` (super admin): privacy requests (list/filter/start/complete/execute deletion), partner profile-change decisions, launch-readiness report. Strategic defence-in-depth on `/admin/enquiries`, enquiry detail and dashboard metrics (reusing `hideRestricted`/`visibleEnquiryTypes`).
- **Results:** `tsc -b` clean, ESLint clean, Vitest 162/162 (27 files), build passes.
- **Not done:** meeting confirm/decline/cancel, own-session/recovery-code management, criteria reference panel (backend supports them; unbuilt); all live-authenticated, browser, responsive and accessibility verification. **Status: not production-cleared.**
- **Phase 21 follow-up:** meeting confirm/decline/cancel added to `EnquiryActions` for `type=meeting` enquiries (`POST /admin/meetings/{id}/confirm|decline|cancel`; calendar attestation + end>start validated; success toast only after backend 2xx). Vitest now 165/165 (28 files); typecheck, lint, build pass. Not live-tested.

## Phase 22 – Partner Portal foundation & cross-portal audit

- **Finding:** the backend already exposes a full partner API (`/api/v1/partner/*`: applications, organization profile/completion/history/change-requests, documents with versions, messages, notifications, enquiries). The repo is the Admin Console only; the Public Website is not in it. `authStore`/`authService` are staff-only (`authService` rejects partner accounts), so partner auth is Phase 23.
- **Built:** `src/partner/` (layout with header, responsive nav, notification and account entries; route namespace `/partner/*`; verified endpoint registry; honest module scaffolds). Not under the admin guard, not in admin navigation. No auth, logout or data pages yet. `ModulePlaceholder` got an optional `note` prop. Docs: `PARTNER_PORTAL_ARCHITECTURE.md`.
- **Results (2026-11-10):** `tsc -b` clean, ESLint clean, Vitest 167/167 (+2 partner route tests), production build passes (existing >500 kB chunk warning). **Not verified:** live backend with a partner account, browser rendering/responsive layout.

## Phase 23 – Partner authentication & secure access

- **Built:** partner login (`/partner/login`, MFA reuse), activation (`/partner/activate`), forgot/reset password via the shared endpoints, `PartnerRoute` guard, header logout and organization name, `authStore.partner` (exclusive with staff `user`), `partnerAuthService.loadSession` (accepts `user_type=partner` + organization only). Admin login/guard behaviour unchanged (only additive: MFA components exported, `loginRoute` prop, `acceptInvitation`).
- **Backend:** all endpoints pre-existing and verified in the spec; nothing invented. Eligibility (activation, suspension) is decided by the backend's generic 401. Tokens memory-only, refresh signs out; no cross-tab sync.
- **Results (2026-11-10):** `tsc -b` clean, ESLint clean, Vitest 182/182 (+15 in `src/partner/partnerAuth.test.tsx`, mocked API), build passes (existing >500 kB chunk warning). **Not verified:** live partner login/activation/reset, invitation email link target, browser/responsive rendering.

## Phase 24 – Partner account invitation & activation

- **Finding:** the lifecycle (Admin Console invitation -> emailed link -> `/partner/activate` -> sign in) was already wired in Phases 21-23 against the only two backend endpoints that exist. The spec (re-fetched 2026-11-10) has no invitation status, delivery status, expiry, revoke, resend or history endpoint, so those features were NOT built or simulated. See `PARTNER_PORTAL_ARCHITECTURE.md` (Phase 24) for details and the backend dependency list.
- **Changed:** `PartnerActivatePage` (password show/hide, token removed from URL, invalid/expired/used guidance on 400). New `src/partner/activation.test.tsx` (6 tests: valid activation, missing token, mismatch, 400 guidance, API failure, visibility toggle).
- **Not done / blocked:** status display, resend, expiry/revoked states, provisioning history, distinct error states (backend). Login-after-activation is covered by the Phase 23 login tests; not run live.

## Phase 25 – Partner Dashboard

- **Built:** `/partner/dashboard` with overview cards (profile completion, application status, open information requests, documents on file), profile completion + missing fields, application status, documents, recent activity (status history + reviewer messages), notifications, enquiry history; per-section loading/empty/error/retry. Details, endpoints, metric sources and omissions: `PARTNER_PORTAL_ARCHITECTURE.md` (Phase 25).
- **Not built (backend):** unread notifications/mark-read, open-enquiry count, document requests/deadlines, account status. Notification/enquiry row field names unverified.
- **Results:** `tsc -b` clean, ESLint clean, Vitest 194/194 (+6 in `PartnerDashboardPage.test.tsx`), production build run (see report). **Not verified:** live partner account, browser/responsive rendering.

## Phase 26 – Company profile management

- **Built:** `/partner/company` (five sections, view/edit per section, prefilled forms, validation from `ProfileUpdate`, save with `expected_version`, submit for staff approval with reason, completion with links to incomplete sections, pending-request banner) and `/partner/profile-changes` (change requests with status and reviewer feedback; revision history). See `PARTNER_PORTAL_ARCHITECTURE.md` Phase 26 for endpoints, fields, workflow and missing backend capabilities.
- **Tests:** `src/partner/pages/PartnerCompanyPage.test.tsx` (11, mocked API): validation rules, partial save, 409, approval request needs reason, completion link, pending/rejected display, no ids sent, unauthenticated redirect, 403.
- **Results (2026-11-10):** `tsc -b` clean, ESLint clean, Vitest 205/205, production build passes (existing chunk warnings). **Not verified:** live partner account (which fields the backend allows via PUT vs approval), browser/responsive rendering.

## Phase 27 – Partner document management

- **Built:** `/partner/documents`: category groups with status, metadata and reviewer message; upload (select/drag-drop, validation, progress, cancel, retry, optional expiry), replace with new version, confirmed soft delete, version history, authorised preview/download with revoked blob URLs, additional document requests (reviewer messages naming categories) with upload actions and a reply to the reviewer. Dashboard Documents card now shows pending requests / awaiting review / needs attention using the same definitions and cached queries. Details: `PARTNER_PORTAL_ARCHITECTURE.md` (Phase 27).
- **Admin Console:** unchanged; it already reviews partner documents and raises information requests from the same backend data.
- **Tests:** `src/partner/pages/PartnerDocumentsPage.test.tsx` (mocked API): validation, listing/status mapping, locked vs replaceable, empty/403, no ids sent, upload with progress, rejected file, failure + retry, replace, requests, reply, delete confirm, download + URL revocation.
- **Not built (backend):** size limit, malware scanning, request deadline/status, upload-to-request link, per-document lock flags.
- **Results (2026-11-10):** `tsc -b` clean, ESLint clean, Vitest 224/224, production build passes (existing chunk warnings). **Not verified:** live partner account, browser/responsive rendering.

## Phase 28 – Application status & review tracking (2026-11-10)
Done: `/partner/application` page (overview, progress tracker, decision, information requests with response form, reviewer messages, status history, onboarding lifecycle); `utils/applicationStatus.ts`, `hooks/useApplicationTracking.ts`; dashboard application card shows latest update and outstanding actions (shared query keys). Real backend statuses only (no `approved`). Tests: `PartnerApplicationPage.test.tsx`. Validation: tsc OK, eslint OK, vitest 239/239, build OK. Gaps and rules: see PARTNER_PORTAL_ARCHITECTURE.md Phase 28. Not started: Partner Onboarding Management, Communication & Notifications.

## Phase 29 – Partner Onboarding Management
Done: `/partner/onboarding` workspace (overview, onboarding progress tracker, partner action center, checklist notice, documents, onboarding messages, onboarding history, lifecycle with provisioning boundary), dashboard Onboarding card, nav entry, shared `components/Panel.tsx`. **Backend has no onboarding/checklist/partner-action API**, so everything is read-only and derived from existing partner endpoints (applications, history, messages, completion, documents); only `pilot_onboarding` and `scale_up` are onboarding stages; completion is never inferred. Tests: `PartnerOnboardingPage.test.tsx` (derivation + page). Validation: tsc OK, eslint OK, vitest 253/253, build OK. Details and gaps: PARTNER_PORTAL_ARCHITECTURE.md Phase 29. Not started: Project & Engagement Visibility, Communication & Notifications.

## Phase 30 – Project & engagement visibility (2026-11-10) – PARTIAL, backend-blocked
Re-fetched OpenAPI: no partner project/engagement/milestone/assignment endpoints exist, so no project list, detail, status tracking, actions, milestones, project documents/messages or dashboard metrics were built (nothing simulated). Delivered: `/partner/projects` page + nav entry (honest "not available" state; real `pathway` from `GET /partner/applications`), `utils/engagement.ts`, tests `PartnerProjectsPage.test.tsx`. Missing backend capabilities and deferred features are listed in `PARTNER_PORTAL_ARCHITECTURE.md` §Phase 30. Admin Console and Public Website untouched.

## Phase 31 – Partner Communication & Notifications (2026-11-10)

**Built (only what the verified backend contract supports, openapi 2026-11-10):**
- `/partner/messages` (`PartnerMessagesPage`): partner-visible messages for the latest application
  (`GET /partner/applications/{id}/messages`), "Awaiting your response" requests with reply
  (`POST …/messages {in_reply_to, body≤4000}`, shared `RequestCard`, duplicate-submit guarded), full
  conversation history, link to requested documents.
- `/partner/notifications` (`PartnerNotificationsPage`): email notifications
  (`GET /partner/notifications?page&page_size`), loading / empty / error+retry, Previous/Next
  (no total returned, so Next shows only on a full page).
- Shared: `components/RequestCard.tsx` extracted from the Application page (behaviour unchanged).
- Route kept at `/partner/messages` (existing nav/route); `/partner/communications` not added.

**Isolation/security:** org derived from the token server-side; query keys include partner id;
reviewer identity and internal notes are not in `PartnerMessageOut`; text rendered as React text.

**Not built – backend gaps (nothing faked):** in-app notification feed; read/unread state, unread
count/badge, mark (all) as read; notification categories/links; notification preferences;
message attachments; message read status; per-message detail endpoint; cross-application message
inbox (only per application); search/filter/pagination on messages; admin-visible delivery status
for partner replies; real-time updates.

**Tests:** `PartnerMessagesPage.test.tsx` (6 tests: request+history, no application, API error,
email rows, empty list, API error). Full run: 37 files / 265 tests passed; `tsc -b`, `eslint src`
clean; `npm run build` succeeded. Not tested: live backend (no partner account), cross-partner/401
flows beyond existing guard tests, mobile layout (not browser-verified).

## Phase 32 – Discussions, Meetings & Follow-ups (2026-11-10) – PARTIAL, backend-blocked
Re-fetched OpenAPI: **no partner-facing discussion, meeting or follow-up endpoints exist.** Follow-ups (`POST /admin/enquiries/{id}/follow-ups[/{id}/complete]`) and meetings (`POST /meetings` public; `/admin/meetings/{id}/confirm|decline|cancel`) are staff/public only. Nothing was simulated.
- `/partner/discussions` → redirects to `/partner/messages` (the only partner-visible thread: `GET/POST /partner/applications/{id}/messages`, Phase 31); no second discussion system.
- `/partner/follow-ups` (`PartnerFollowUpsPage`): lists reviewer information requests (open/answered) from the existing messages query and replies via the existing endpoint (`RequestCard`, duplicate-submit guarded). No due dates, categories, assignee or mark-complete (not in contract).
- `/partner/meetings` (`PartnerMeetingsPage`): honest "not available" state, no API calls. No accept/decline/reschedule.
- Nav: Meetings and Follow-ups added. Notifications unchanged (email rows only).
- Tests: `PartnerPhase32.test.tsx` (5). Validation: `tsc -b` clean, ESLint clean, Vitest 38 files / 270 tests passed, `npm run build` succeeded. Not verified: live partner account, cross-partner/restricted-record access (no partner account), responsive rendering in a browser.
- Backend needed: partner discussion list/detail/reply with `partner_visible` flag; partner meetings list + respond (accept/decline/reschedule) with notes/attachments; partner follow-ups list with due date/status/category + partner completion; partner notification feed for these events.

## Phase 33 – Partner Team & User Management (2026-11-10) – BACKEND-BLOCKED
Backend audit (openapi 2026-11-10): the data model allows several partner users per organization (`InvitationIn.organization_id`; `/auth/me` returns `organization`), but there is **no partner-facing team API**: invitations are super-administrator only (`POST /reviewer/invitations`, returns only `organization_id`); `/admin/users*` (list/invite/role/activate/deactivate/mfa-reset) is staff-only and uses `StaffRole` (never reused for partners); no partner roles/permissions, team list/detail, invitation status/resend/cancel/expiry, partner deactivate/remove, last login. Activation uses `POST /auth/invitations/accept` (token, password) – unchanged. Nothing simulated.
- Built: `/partner/team` (`PartnerTeamPage`, nav "Team"): own account from the auth store + honest "not available" state; zero API calls. `/partner/team/invite` and `/partner/team/:id` deliberately not created.
- Isolation: org derived from the token server-side; no org id sent by the frontend. Cross-organization tests not possible without a second partner account.
- Tests: `PartnerTeamPage.test.tsx` (2). Validation results: see final report.

## Phase 34 – Partner Performance Overview & Scorecards (2026-11-10) – BACKEND-BLOCKED
Audit of live OpenAPI: no partner performance, scorecard, feedback, milestone, engagement, trend or export endpoints (admin reports are staff-only). Built `/partner/performance` with an honest unavailable state, own application history, feasibility table; no fake scores, charts or exports. Admin Console untouched. Details and backend requirements: PARTNER_PORTAL_ARCHITECTURE.md Phase 34. Tests: `PartnerPerformancePage.test.tsx`. Validation results: see final report.

## Phase 35 – Partner settings & security
Built `/partner/settings` (Account), `/settings/security`, `/settings/privacy` over verified shared endpoints: sessions list/revoke, MFA enroll/confirm/recovery-codes, password-reset email, `POST /privacy/requests`. Not built (no backend): change-password, personal-profile edit, MFA status/disable, sign-out-all, notification preferences, privacy request status. Details and gaps: PARTNER_PORTAL_ARCHITECTURE.md Phase 35.
**Validation (run 2026-11-10):** `tsc -b` clean; `vitest run` 283/283 passed (6 new tests in `PartnerSettings.test.tsx`); `npm run build` succeeded; `eslint .` reports 3 errors only in a pre-existing `.tmp/fix.cjs`, none in Phase 35 files. Not tested against a live partner account; mobile layout not visually checked.

## Phase 36 – Cross-portal integration audit (2026-11-10)
Audit only; no product changes. Fixed `npm run lint` (ignore `.tmp`) and an ineffective dynamic import in `src/partner/routes.tsx`. All endpoint paths match the live OpenAPI; unauthenticated live probes return 401; public form endpoints require `X-Bot-Token`; CORS preflight from localhost rejected (X9). `tsc`, ESLint, Vitest 283/283, build, `npm audit` clean. Public Website is not in this repo; no live credentials, so no live workflow verification and no browser/E2E/a11y checks. Full results: `CROSS_PORTAL_INTEGRATION_REPORT.md`.

## Phase 37 – PRD gap closure & final acceptance validation (2026-11-10)
Requirement-by-requirement audit against the consolidated Master PRD. New files: `PRD_REQUIREMENT_TRACEABILITY_MATRIX.md` (103 requirements), `BACKEND_DEPENDENCY_REGISTER.md`, `FINAL_PROJECT_ACCEPTANCE_REPORT.md` (decision: **Not ready for production**).
**Fix:** staff change-password was disabled in `src/config/endpoints.ts` and `authService.changePassword` would have posted camelCase form values; it now calls `POST /api/v1/auth/change-password` with `{current_password,new_password}`; test `src/features/auth/services/changePassword.test.ts`.
**Follow-up wiring (same phase, after "proceed"):** Partner Security page now has a change-password form (`authService.changePassword`, zod `changePasswordSchema`) beside the reset-by-email fallback; Partner Notifications uses typed `PartnerNotificationOut` with `POST .../{id}/read` and `/read-all`; Partner Accounts has a read-only `AccountsDirectory` (`GET /admin/accounts?user_type=partner`) and an updated capability matrix. Vitest is now 285/285 (42 files), Playwright 28 passed / 2 skipped, tsc/ESLint clean, build passes. Then account actions (`invitation/resend|revoke`, `suspend`, `reactivate`) were added to the directory with `actionsFor` state rules and confirmation dialogs; Vitest 287/287, Playwright 28 passed / 2 skipped, tsc/ESLint/build clean. Transitions, follow-up edit/cancel, enquiry activity, assignees, permissions, account detail and admin password-reset remain unwired.
**Findings:** live OpenAPI is now 134 paths (+19 since Phase 36): account management, follow-up list/update/cancel, enquiry activity, assignees, documents list, security policy, reviewer transitions, permissions, partner notification read-state, change-password. `BACKEND_GAPS.md` is partly stale (X5, X8, X11, §9, §12). Not wired (Register Part C). The Public Website is not in this repo; the Downloads site is a different product that breaches PRD claim rules.
**Validation (run today):** `tsc -b` clean; ESLint clean; Vitest 284/284 (42 files); Playwright 28 passed / 2 skipped (live tests need `E2E_*` credentials); build passes (720 kB main chunk warning); `npm audit --omit=dev` 0. No live authenticated verification was possible.
