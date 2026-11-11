# Dynamic Functionality and API Integration Audit

**Date:** 2026-11-11 · **Branch:** main (working tree has many pre-existing uncommitted changes; this audit changed no source files) · **Backend:** https://coralswift-backend.onrender.com (OpenAPI 3.1.0, "CoralSwift" v0.1.0, fetched live today)

Companion files: [API_ENDPOINT_COVERAGE_MATRIX.md](API_ENDPOINT_COVERAGE_MATRIX.md) (183 operations) and [FRONTEND_FEATURE_COVERAGE_MATRIX.md](FRONTEND_FEATURE_COVERAGE_MATRIX.md) (115 features).

## 0. Verification levels (never combined)

| Level | What it means here | Result |
|---|---|---|
| **1. Source-code verified** | Read the route, page, hook, service and HTTP call, and confirmed the response feeds the UI | All 115 features and 183 operations |
| **2. Automated-test verified** | Vitest suite; the API client is mocked in these tests | 54 files / 328 tests pass. This is **not** live-backend evidence |
| **3. Staging / runtime verified** | Real authenticated calls against the backend | **None.** No staging credentials were available. Only unauthenticated probes were made (see §10) |

Every cross-portal workflow is therefore **NOT RUNTIME VERIFIED**.

## 1. Executive summary

- The application is **genuinely dynamic**. A scan of all non-test source found no mock services, no fake JSON responses, no local-only CRUD, no fabricated success messages and no hardcoded dashboard statistics or chart datasets. Every data page reads from the shared Axios client (`src/services/api/client.ts`) and every mutation sends a real request and invalidates its queries.
- **Features (115):** 91 Fully Dynamic (79.1%), 10 Partially Dynamic (8.7%), 0 Static/Hardcoded, 0 Mocked/Simulated, 4 Not Implemented (3.5%), 10 Backend Blocked (8.7%).
- **API operations (183):** 150 fully integrated (82.0%); 6 partial; 3 present but unused; 2 missing frontend integration; 18 intentionally unused (public website endpoints plus one partner detail endpoint); 4 not applicable (health/meta). Against the 161 console-relevant operations, 93.2% are fully integrated.
- **Most important gap:** the Partner Portal cannot **create** an application. `POST /partner/applications` is never called, and the Application page only says "When your partner application is created it will appear here". Unless the backend auto-creates a draft on activation (not verified), step 4 of the cross-portal workflow cannot be done from the UI.
- Second gap: the Partner **Enquiries** route is still a "Scaffold only" placeholder even though `GET /partner/enquiries` exists.
- Quality gates are green: `tsc -b`, ESLint, 328 unit tests and the production build all pass.
- Several comments and docs are stale (see §11). The live OpenAPI (183 operations) is much larger than the "115 paths" some comments cite.

## 2. Application and module inventory

- **Stack:** React + Vite + TypeScript, React Router (lazy admin routes), TanStack Query, Axios, Zustand auth store. About 294 TS/TSX files.
- **Admin Console** (`/admin/*`): 22 permission modules gating about 45 routes (dashboard, profile and change-password, enquiries ×5, strategic ×3, lead assignment, discussions, follow-ups, applications ×2, application reviews ×2, documents ×3, onboarding ×3, partners ×2, partner accounts ×2, communications ×5, notifications, website CMS ×9, reports ×2, users ×2, roles, audit ×2, governance, system settings ×2).
- **Partner Portal** (`/partner/*`): public auth routes (login, forgot, reset, activate) plus about 18 guarded routes (dashboard, application, onboarding, company, documents, projects, performance, messages, meetings, follow-ups, notifications, enquiries, profile-changes, team, settings ×3).
- Shared pieces: `src/services/api/client.ts` (Bearer injection, single-flight 401 refresh), `csv.ts` (formula-safe CSV download), `config/endpoints.ts`, `partner/config/endpoints.ts`.

## 3. Overall dynamic-functionality assessment

| Dimension | Finding |
|---|---|
| Data source | All listed data comes from the backend; counts use backend `meta.total` (page_size=1 trick) rather than local counting |
| User actions | Every button inspected maps to a mutation or a navigation; no no-op handlers found |
| Error handling | Pages use `ErrorState`/`toAppError`; Retry buttons present; 409/403 surfaced as-is |
| Persistence | All writes go through the API; no local-storage business data. Persistence across refresh is **inferred from code, not observed** |
| Permissions | UI gating is a hardcoded hint (`config/permissions.ts`); the backend is the real enforcer |
| Honesty about gaps | Backend-blocked pages say so in plain language rather than showing fake data |

## 4. Admin Console findings

**Fully dynamic (68 of 84 features):** auth and MFA, enquiries (list/filter/detail/status/assign/follow-ups/attachments/activity/meetings), strategic enquiries, lead assignment and workload, follow-ups queue and cancel, applications and review workspace (assign, transitions fetched from `/reviewer/transitions`, information requests, notes, eligibility, document review and download), document queue and requests, approved applicants and provisioning, partners (detail, revisions, activity, suspend/reactivate), partner-account lifecycle actions, outbox/dispatch/retry/templates, staff notification feed, full content workflow (create, versions, submit/approve/reject/publish/schedule/unpublish/reopen/archive, attachment, claims), backend report panels and three CSV exports, staff user management, audit list/detail/CSV, governance (privacy, change requests, launch readiness), settings and security policy.

**Partially dynamic (10):** see §6.

**Not implemented (2):** staff session list/revoke and staff recovery-code regeneration (endpoints exist; only the Partner Portal calls them).

**Backend blocked (4):** email composer, communication preferences, website Homepage/Services/Industries/Media pages, permission matrix.

## 5. Partner Portal findings

**Fully dynamic (23 of 31):** login/MFA, activation, dashboard (five independent queries), application view/history, draft edit, readiness, submit, resubmit, withdraw, onboarding tracker (derived from real status history), company profile with optimistic-locking update (`expected_version`), change requests and revisions, documents (upload, replace, remove, audited download, history), document requests, messages and replies, information-request follow-ups, notifications (list, read, unread, read-all, badge), account profile, change password, sessions, MFA disable and recovery codes, privacy requests.

**Not implemented (2):** application creation; Enquiries page.

**Backend blocked (6):** projects, performance, meetings, team, staff follow-ups/due dates, notification preferences. Each page states plainly that the backend provides no endpoint.

## 6. Partially dynamic features (exact list)

| # | Feature | Why partial | File |
|---|---|---|---|
| 1 | Role-based module gating | Role-to-module map hardcoded; `GET /auth/permissions` never called | `config/permissions.ts` |
| 2 | Dashboard enquiry/application/partner charts | Real data aggregated client-side from the latest page of rows; truncation banner shown | `features/dashboard/pages/DashboardPage.tsx:145-193` |
| 3 | Lead-assignment category tallies | Tallies supplied rows only (sample) | `features/lead-assignment/utils/assignment.ts:86` |
| 4 | Discussions metrics | "Pending responses" is a proxy (applications in `information_requested`); no thread resource | `features/follow-ups/services/followUpsService.ts` |
| 5 | Follow-up edit | Only `due_at` is sent; note and assignee changes unsupported | `features/follow-ups/components/AllFollowUps.tsx:44` |
| 6 | Onboarding overview | Document counts for the 25 most recent applicants only | `features/onboarding/pages/OnboardingPage.tsx:16,27` |
| 7 | Partner-account detail | `GET /admin/accounts/{id}` unused; page stitches org detail and audit events | `features/partner-accounts/pages/PartnerAccountDetailPage.tsx` |
| 8 | Reports row-level sections | `fetchAll` caps at 5 × 100 rows and flags `partial`; totals are exact | `features/reports/utils/aggregate.ts:35` |
| 9 | Roles overview | Member counts live; role names/modules from hardcoded config | `features/roles-permissions/pages/RolesPage.tsx` |
| 10 | Audit breakdowns | Computed from the latest 100 events and labelled "sample" | `features/audit-logs/hooks/useAudit.ts:21` |

## 7. Static, hardcoded, mocked and simulated

- **Static/Hardcoded business data: none found.** Grep of all production source for mock/dummy/lorem/fixture/faker and for constant arrays turned up only legitimate presentation or enum content: navigation, route tables, OpenAPI enum mirrors (`DOC_CATEGORIES`, `PATHWAYS`, `SERVICE_CATEGORIES`, `PORTAL_STATUSES` all match the live spec enums), chart palettes, capability/feasibility explanation tables (`CAPABILITIES`, `FEASIBILITY`), and status-badge mappings. These are **not defects**.
- **Mocked/Simulated in production code: none.** Mocks exist only in `*.test.*` files and the Playwright spec (`e2e/portals.e2e.ts` stubs `/auth/login`).
- **Rule of thumb applied:** an enum list is acceptable while it matches the spec; it becomes drift risk if the backend adds a value (e.g. `DOC_CATEGORIES` is duplicated in two files: `application-review/components/DocumentRequests.tsx` and `partner-applications/types/index.ts`).
- **TODO/FIXME:** none found. The only "PENDING" marker is the comment in `config/permissions.ts`.
- **Disabled/dummy actions:** none found; unavailable features render an `EmptyState` with no fake button.

## 8. Missing functionality (exact list)

1. Partner: **create application** (`POST /partner/applications`) - no UI, no service function.
2. Partner: **Enquiries page** - route renders `ModulePlaceholder` ("Scaffold only") in `partner/routes.tsx:70` / `PartnerModulePage.tsx`.
3. Admin: staff **sessions** list/revoke (`GET|DELETE /auth/sessions[/{id}]`).
4. Admin: staff **recovery-code regeneration** (`POST /auth/mfa/recovery-codes`).
5. Admin: backend-derived permissions (`GET /auth/permissions`) unused.
6. Admin: follow-up note edit and reassign (`PATCH` fields beyond `due_at`).
7. Admin: `GET /admin/accounts/{id}` and partner `GET /partner/applications/{id}`, `GET /partner/documents/{id}` unused (low impact).

## 9. Cross-portal workflow (source trace; none runtime verified)

| Step | Source trace | Status |
|---|---|---|
| 1 Admin invites partner | `ProvisioningPanel.tsx` → `POST /reviewer/invitations` | Wired · NOT RUNTIME VERIFIED |
| 2 Partner activates and logs in | `PartnerActivatePage.tsx` → `POST /auth/invitations/accept`; `PartnerLoginPage.tsx` | Wired · NOT RUNTIME VERIFIED |
| 3 Completes profile | `ProfileSection.tsx` → `PUT /partner/organization` | Wired · NOT RUNTIME VERIFIED |
| 4 Creates and submits application | Create: **no UI**. Submit: `ApplicationActions.tsx` → `POST .../submit` | **Gap at create** · NOT RUNTIME VERIFIED |
| 5 Admin receives it | `GET /reviewer/applications` | Wired · NOT RUNTIME VERIFIED |
| 6 Assigns reviewer | `POST .../assign` | Wired · NOT RUNTIME VERIFIED |
| 7 Requests information | `POST .../information-requests` | Wired · NOT RUNTIME VERIFIED |
| 8 Partner is notified and responds | `GET /partner/notifications`, `POST .../messages` | Wired · NOT RUNTIME VERIFIED |
| 9 Partner resubmits | `POST .../resubmit` | Wired · NOT RUNTIME VERIFIED |
| 10 Admin decides | `POST .../transition` (rules from `/reviewer/transitions`) | Wired · NOT RUNTIME VERIFIED |
| 11 Partner sees status and history | `GET /partner/applications`, `.../history` | Wired · NOT RUNTIME VERIFIED |

Both portals use the same backend resources (the partner derives its organisation from the token; the admin side addresses the same application ids), so record consistency is structurally sound, but it was not observed.

## 10. Authentication and authorization findings

- Login → optional MFA (enroll/confirm/verify) → `GET /auth/me`; refresh uses a single-flight interceptor and treats failed login/refresh as real answers rather than expiry (`client.ts`). Transient refresh failures keep the session.
- Route guards (`ProtectedRoute`, `ModuleRoute`, `PartnerRoute`) are UX only and say so; the backend enforces access. Confirmed live that protected routes reject unauthenticated calls: `GET /admin/overview`, `/partner/applications`, `/auth/permissions` → 401.
- **Finding:** role-to-module mapping is hardcoded rather than derived from `GET /auth/permissions`. Low risk (backend enforces) but can drift.
- Partner portal shows backend-decided `can_replace/can_remove/can_download` flags, which is the right pattern.
- Cross-tab session ownership handled in `store/tabOwner.ts` (unit tested, mocked).

## 11. Documentation and comment drift (stale, found while tracing)

- `config/endpoints.ts` header says verified "2026-11-09"; comments claim "NO partner-account list…" and "NO in-app notification feed" although `/admin/accounts*` and `/admin/feed` now exist and are used.
- `partner/config/modules.ts` says notifications have "no in-app feed or read/unread state"; the page implements read/unread.
- `partner/pages/PartnerPerformancePage.tsx` cites "115 paths"; the live spec has 183 operations.
- `partner/services/partnerSettingsService.ts` says "no change-password endpoint" but `PartnerSecurityPage` calls `authService.changePassword`.
- `features/partner-accounts/utils/accounts.ts:24` says "no admin-initiated reset" while the directory offers a `password-reset` action.
- Existing files under `docs/` were not relied upon; only source and the live spec were.

## 12. Runtime and quality test results

| Check | Result | Level |
|---|---|---|
| TypeScript `tsc -b` | Pass, 0 errors | Local |
| ESLint `eslint .` | Pass, 0 problems | Local |
| Vitest | **54 files, 328 tests passed** (jsdom, API mocked) | Automated, mocked |
| Production build `vite build` | Pass (chunk-size warning: some chunks > 500 kB) | Local |
| Playwright `e2e/portals.e2e.ts` | **Not run** (needs browsers and a served app; spec stubs login) | - |
| `scripts/probe-live.mjs` (untracked) | Not run | - |
| Unauthenticated live probes | `/health/ready`, `/api/v1/meta`, `/api/v1/catalog/project-categories` → 200; three protected GETs → 401 | Runtime (unauthenticated only) |
| Authenticated network requests, CRUD persistence, pagination, role restrictions, session restore, previews/downloads, CSV exports, cross-portal flow | **Not verified** (no credentials) | Blocked |

## 13. Critical issues and recommended fixes

1. **Partner cannot create an application (High).** Add a "Start application" flow calling `POST /partner/applications` with `{pathway, cover_note}`, or confirm with the backend that a draft is auto-created at activation and document it.
2. **Partner Enquiries page is a placeholder (Medium).** Build the list from `GET /partner/enquiries` (already used for the dashboard panel) and remove the `enquiries` entry from `PARTNER_MODULES`.
3. **Runtime verification gap (High for release).** Provide staging staff and partner credentials and run `e2e` plus the 11-step workflow; settings payload shape (`GET /admin/settings`, untyped) in particular is parsed defensively and unverified.
4. **Hardcoded permission map (Low).** Use `GET /auth/permissions` for UI gating, or keep the map and add a contract test.
5. **Capped aggregations (Low).** Dashboard, lead assignment, onboarding and audit breakdowns are samples; keep disclosures or request server-side aggregates.
6. **Admin parity (Low).** Add staff session management and recovery-code regeneration.
7. **Clean up stale comments/docs** listed in §11.

## 14. Final summary and metrics

**Features (denominator 115; source-code verified):**

| Class | Count | % |
|---|---|---|
| Fully Dynamic | 91 | 79.1% |
| Partially Dynamic | 10 | 8.7% |
| Static/Hardcoded | 0 | 0.0% |
| Mocked/Simulated | 0 | 0.0% |
| Not Implemented | 4 | 3.5% |
| Backend Blocked | 10 | 8.7% |

Admin 84 features (68 FD / 10 PD / 2 NI / 4 BB); Partner 31 features (23 FD / 2 NI / 6 BB).

**API operations (denominator 183; source-code verified):**

| Status | Count | % of 183 |
|---|---|---|
| Fully integrated | 150 | 82.0% |
| Partially integrated | 6 | 3.3% |
| Present but unused | 3 | 1.6% |
| Missing frontend integration | 2 | 1.1% |
| Intentionally unused | 18 | 9.8% |
| Not applicable | 4 | 2.2% |
| Runtime verification blocked | 161 (all console-relevant) | 88.0% |

**Verification levels, kept separate:** source-code verified: 115/115 features and 183/183 operations. Automated-test verified (mocked): 328 tests passing; no per-feature live claim. Staging/runtime verified: 0 authenticated operations; 3 unauthenticated GETs (200) and 3 auth-gating checks (401).

## 15. Exact lists

**Static / hardcoded integrations:** none (legitimate static content only).

**Mocked / simulated in production code:** none.

**Partially dynamic:** the 10 items in §6.

**Incomplete / not implemented:** partner application creation; partner Enquiries page; admin staff sessions; admin recovery-code regeneration.

**Backend blocked (honestly surfaced in UI):** admin email composer, admin communication preferences, CMS Homepage/Services/Industries/Media, permission matrix; partner projects, performance, meetings, team, staff follow-ups/due dates, notification preferences.

**Missing / unused API integrations:** `POST /partner/applications`, `GET /auth/permissions`, `GET /admin/accounts/{id}`, `GET /partner/applications/{id}`, `GET /partner/documents/{id}`, staff use of `/auth/sessions*` and `/auth/mfa/recovery-codes`, `PATCH` follow-up note/assignee fields, full use of `GET /partner/enquiries`.

_No source files were modified, committed, pushed, reset or deleted. Build and test commands may have refreshed git-ignored outputs only. These three docs are new, untracked files._

## 16. Remediation log (2026-11-11)

Original sections above are historical. Resolved: §8 items 1, 2, 3, 4, 5, 6 (see Feature matrix remediation table). Partially resolved: §6 #1 and #9 (permissions: 15 modules probed by route prefix; module-to-route mapping cannot be confirmed without a live token). **Not resolved:** §6 #2, #3, #4, #6, #8, #10 (capped/sample aggregates: no backend aggregate endpoints for them; paging all rows client-side was not implemented in this pass), §6 #7 (account detail), §8 #7.

Backend requirements still open: aggregate/count-by-field endpoints for enquiries, applications, partners, audit and assignments; a discussions/thread resource for "pending responses"; user-id on organisation detail (or an org-to-user lookup) to use `GET /admin/accounts/{id}`; partner enquiry detail/create/reply endpoints if partners should converse on enquiries; endpoints for the 10 backend-blocked features (unchanged).

Quality gates after changes: `tsc -b` clean; `eslint .` clean; Vitest 55 files / 333 tests pass (mocked); `vite build` passes. Cross-portal workflow (11 steps) and every authenticated call remain **BLOCKED / NOT RUNTIME VERIFIED** (no staging credentials). Files changed this pass: `partner/components/StartApplication.tsx` (new), `partner/pages/PartnerEnquiriesPage.tsx` (new), `features/auth/components/StaffSecurity.tsx` (new), plus edits to partnerDashboardService, PartnerApplicationPage, PartnerDashboardPage (submitted_at), partner routes/modules, authService, authStore, auth types, config/endpoints, config/permissions, useAuth, RolesPage, ProfilePage, AllFollowUps and their tests.

## 17. Priority 3 remediation (2026-11-11, second pass)

| §6 item | Resolution |
|---|---|
| #2 Dashboard charts | Lists are now paged to completion (100 rows/page, 5,000-row safety ceiling via `fetchAll`). The "incomplete" banner shows only if the ceiling is hit. |
| #3 Lead-assignment tallies | `tallyWorkload` (sample tally) has no remaining caller; workload comes from the exact `GET /admin/workload`, and category counts use backend totals. |
| #4 Discussions metric | Still a proxy, now labelled honestly "Applications awaiting information" (status count, not a reply count). Needs a backend thread resource for a true metric. |
| #6 Onboarding documents | Detail fan-out raised from 25 to 100 applicants; the existing caption states the coverage when there are more. Exact totals would need a per-organisation document count endpoint. |
| #8 Reports rows | `MAX_PAGES` raised 5 to 50; `partial` still flagged at the ceiling. |
| #10 Audit breakdowns | Now built from all events (paged, same ceiling); a note appears if fewer events than the backend total were loaded. |

Verification: `tsc -b`, ESLint and 333 mocked Vitest tests pass; no new unit tests were added for the paging change, and it is not runtime verified. Trade-off: large datasets now cost up to 50 sequential requests per list on dashboard/audit load.

## 18. Pass 3: validation, pagination reliability, final gates (2026-11-11)

Sections 1 to 17 are historical; the figures in section 14 are superseded by the table below.

### 18.1 Validation of earlier remediation (source-code verified, then test-covered)

| Area | Schema check against live OpenAPI | Result |
|---|---|---|
| Partner application creation | `DraftIn { pathway: EngagementPathway (3 values), cover_note? 1..4000, additionalProperties: false }` | Request matches; `PATHWAYS` equals the enum; blank note omitted, 4,000 limit enforced client-side; backend rejection keeps the form. Tests added for the rejection and over-long note |
| Partner enquiries | `PartnerEnquiryOut { reference_number, enquiry_type, status, submitted_at }`, no query parameters | Matches; list is unpaged so search/filter/paging run client-side. Test added for ordering and page 2 |
| `GET /auth/permissions` | `PermissionsOut { account_type, staff_role, modules[{module, endpoints[]}], role_matrix? }` | Matches. GET-only paths used; empty or failed response falls back to the role hint. Tests added (GET filtering, empty, failure, per-module prefix mapping, grant and deny overrides) |
| Follow-up editing | `FollowUpUpdate { note? 1..4000, due_at?, assignee_id? }`, null clears due_at and assignee_id | Matches; only changed fields sent. Tests added (note, reassign, unassign null, clear due null, no-op, empty and 4,001-char note blocked, rejection, completed items not editable) |
| Staff sessions | `SessionOut`, `DELETE /auth/sessions[/{id}]` | Matches. Tests added (list, current session not revocable, revoke one, revoke all with confirmation, error state) |
| Recovery-code regeneration | `MfaCodeIn.code` is exactly 6 characters | **Defect fixed:** the button previously enabled for any non-empty text; it now requires 6 digits. Tests added (validation, success shows codes once, rejection keeps form) |

### 18.2 Pagination and reporting reliability

Defects found and fixed in `fetchAll` (`features/reports/utils/aggregate.ts`) and its callers:

1. **Partial data was discarded silently.** `dashboardService` and the audit sample returned bare arrays, so a ceiling hit was invisible; the dashboard banner tested `length >= 5000`, which was wrong whenever the strategic filter removed rows. Services now return `Fetched<T>` (`rows`, `total`, `partial`) and the dashboard note and the audit note are driven by `partial`.
2. **Sequential requests.** All pages were fetched one by one. Page 1 now reveals the backend total and the rest are fetched in parallel batches of 5 (best case for 5,000 rows: 1 + 10 batches instead of 50 serial round trips). Without a reported total it still pages sequentially to a short page.
3. **Duplicates.** Rows with a repeated string `id` (records shifting between pages) are kept once; the shortfall against the reported total then correctly marks the result `partial`.
4. **Failure behaviour.** Any failing page rejects the whole load, so the UI shows its error state; a half-loaded dataset is never returned as complete.
5. `partial` now also covers "fewer unique rows than the reported total", not only the ceiling.

New tests: `aggregate.test.ts` (empty, multi-page order, concurrency bound, 5,000 ceiling, exact-ceiling complete, duplicates, page failure, first-page failure, no-total paths), `dashboardService.test.ts` (range params, empty, ceiling at exactly 50 calls, failure), `DashboardPage.test.tsx` (incomplete note appears only for the partial list, absent for complete data), `useAudit.test.tsx` (complete, ceiling partial, failure).

Partial results the UI now states explicitly: dashboard (enquiries, applications, partners), report row charts ("Partial dataset"), audit breakdowns, partner-account lookup ("Not every partner account could be searched"). Totals and status counts that come from `meta.total` remain exact.

**Where backend aggregates would help (performance):** enquiry, application and partner counts and time series for the dashboard and reports (currently up to 50 requests of 100 rows per list); audit counts by actor and by record type; account-to-organization lookup (a `organization_id` filter on `GET /admin/accounts` would replace paging all partner accounts); onboarding per-organization document counts (currently one detail request per applicant, up to 100 in parallel).

### 18.3 Frontend gaps closed

- **Partner account detail:** the page showed "Per-user: see the Accounts directory". It now lists the organization's account holders (email, status, invitation state and delivery, MFA, last login, recent activity) from `GET /admin/accounts` (matched on `organization.id`, because the list has no organization filter) and `GET /admin/accounts/{user_id}`. Super administrator only, as the backend enforces. Tests: `partnerAccountsService.test.ts`.
- Nothing else in the latest audit remains a frontend gap. The remaining Partially Dynamic items (4) are limited by missing backend capabilities (see the feature matrix).

### 18.4 Backend-blocked features re-checked

Live OpenAPI re-fetched: 183 operations / 162 paths, identical to the endpoint matrix. A keyword scan of all paths (project, performance, meeting, team, preference, send/compose, homepage, media, role, permission, thread, discussion, aggregate, summary) found no new endpoint. Nothing was invented or simulated. Required backend work:

| Blocked feature | Exact backend functionality required |
|---|---|
| Admin email composer | An endpoint to send or queue an ad-hoc email (recipients, template or subject/body, audit) |
| Admin and partner notification preferences | Read and update preferences per account and channel |
| CMS Homepage, Services, Industries, Media library | Typed content resources or a media upload/list API (only generic `/admin/content` exists) |
| Permission matrix editing | Write endpoints for roles and permissions (`GET /auth/permissions` is read-only) |
| Partner projects and performance | Project/engagement resources and scorecard/report endpoints scoped to the partner |
| Partner meetings | Partner-facing meeting list, request and confirmation (only staff `/admin/meetings/*` and public `/meetings`) |
| Partner team | Team member list, invite and role endpoints scoped to the organization |
| Partner follow-ups/due dates | Partner-visible follow-up resource (follow-ups are staff-only) |
| Discussions metric | A discussion/thread resource with reply state, for a true "pending responses" count |
| Partner enquiry detail/create/reply | Detail, create and reply endpoints (only `GET /partner/enquiries`) |
| Exact aggregates | Count-by-field and time-series endpoints (see 18.2) |

### 18.5 Quality gates (local, 2026-11-11)

| Gate | Result |
|---|---|
| `tsc -b` | Pass, 0 errors |
| `eslint .` | Pass, 0 problems |
| Vitest | **62 files, 378 tests pass** (up from 55 / 333; 45 new tests). API client mocked |
| `npm run build` (`tsc -b && vite build`) | Pass; chunk-size warning only (largest chunk 742 kB) |
| Playwright e2e | Not run (needs browsers and a served app) |

### 18.6 Updated statistics (denominators stated)

**Features (115):** Fully Dynamic 101 (87.8%), Partially Dynamic 4 (3.5%), Static 0, Mocked 0, Not Implemented 0, Backend Blocked 10 (8.7%). Admin 84 (76 / 4 / 0 / 4 blocked); Partner 31 (25 / 0 / 0 / 6 blocked).

**API operations (183):** fully integrated 159 (86.9%), present but unused 2 (1.1%), intentionally unused 18 (9.8%), not applicable 4 (2.2%), partial 0, missing 0. Of the 161 console-relevant operations, 159 (98.8%) are integrated. (The earlier 150 / 6 / 2 figures were stale and are replaced.)

| Verification level | Result |
|---|---|
| Source-code verified | 115 / 115 features; 183 / 183 operations |
| Automated-test verified (mocked) | 378 tests; coverage listed in 18.1 and 18.2. Not live evidence |
| Live-backend verified | 0 authenticated operations (3 unauthenticated 200s, 3 auth-gating 401s from the earlier pass) |
| Staging verification | **Blocked**: no credentials. 105 features and 161 operations await it |

### 18.7 Performance risks

1. Dashboard load: up to 3 lists x (1 + ceil(pages/5) batches); worst case 150 requests (3 x 50 pages) on a very large dataset, all repeated on Refresh and on date-range change (enquiries). `staleTime` is 60 s.
2. Audit page: one up-to-50-page load for the breakdowns and the module filter on each visit (the two share one cached query).
3. Reports: each row-level section pages its own list; opening several sections multiplies the cost.
4. Onboarding overview: up to 100 parallel application-detail requests.
5. Parallel batches of 5 may trip a rate limit that sequential paging did not; the backend rate-limit policy (`GET /admin/security-policy`) should be checked on staging. A failed page now surfaces as an error instead of partial data.
6. Partner account lookup pages all partner accounts per detail view until the backend adds an organization filter.
7. Main bundle 742 kB (223 kB gzip); no code splitting beyond routes.

### 18.8 Exact staging verification requirements

Needed: a staff super administrator, a business-development manager, a partner reviewer and a content administrator (each with MFA enrolled and recovery codes), one invited partner user, and a seeded dataset with more than 100 enquiries and applications (and ideally more than 5,000 audit events or a lowered ceiling) to exercise paging.

Run, and record request/response evidence for:
1. Login, MFA, refresh rotation, logout, `GET /auth/permissions` per role: confirm `modules[].endpoints[].path` prefixes match `MODULE_PROBES` (`config/permissions.ts`) and that no role loses a module it needs.
2. Eleven-step cross-portal workflow (invite, activate, profile, **create application via POST /partner/applications**, submit, assign, information request, respond, resubmit, decide, partner sees status).
3. Partner enquiries list shape; field names `reference_number`, `enquiry_type`, `status`, `submitted_at`.
4. Follow-up PATCH variants: note only, assignee only, `due_at: null`, `assignee_id: null`; 409/422 behaviour.
5. Staff sessions list, revoke one, revoke others; recovery-code regeneration (old codes stop working).
6. Dashboard, reports and audit breakdowns with more than 100 rows: counts equal `meta.total`, no duplicates, no 429s from parallel paging; observe the incomplete notices at the ceiling.
7. Partner account detail: `organization.id` present on `GET /admin/accounts`, `GET /admin/accounts/{id}` for a partner user, 403 for non-super roles.
8. `GET /admin/settings` payload shape (still parsed defensively), CSV exports and document downloads, and the Playwright e2e suite against the staging URL.

**The application must not be called production-ready until these pass on staging.**

_No files were committed or pushed. Source changes this pass: `features/reports/utils/aggregate.ts`, `features/dashboard/{services,hooks,pages}`, `features/audit-logs/{hooks,pages}`, `features/partner-accounts/{services,hooks,pages,types}`, `features/auth/components/StaffSecurity.tsx`, plus new and extended tests._
