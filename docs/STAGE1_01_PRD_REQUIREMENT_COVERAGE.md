# Stage 1 Audit 01 – PRD Requirement Coverage (Partner Portal §13, Admin Console §14)

Audit date: 2026-11-11 · Scope: this repository only (Admin Console `src/features`, Partner Portal `src/partner`) · **Audit only: no application source was changed.**

PRD used: `.tmp/prd.txt` (extracted from the consolidated master PRD). The cover says "Version 2.0"; the addendum pages (§28–§30) are footed "Version 3.0". Both are treated as one document.

## How to read this

**Evidence tags** (what I did, not what a doc claims):

| Tag | Meaning |
|---|---|
| **CODE** | I read the source file(s) named in this session. |
| **RUN** | I executed it in this session (typecheck, ESLint, Vitest, spec counting). |
| **DOC** | Stated in an existing repo document; I did not re-verify it. |
| **NONE** | Not verifiable from the frontend or without credentials. |

**Runtime status for every row below is NOT VERIFIED.** No authenticated call to the backend was made in this audit (see `STAGE1_04`). "Implemented" therefore means *the UI, service call and test exist in code*, not *proven working against the live backend*.

**The requirement list is my decomposition of the PRD sentences** (one row per distinct obligation). The PRD does not number its requirements, so the totals are my count, not an official one. Treat the percentages as indicative only.

Status vocabulary: **Implemented** · **Partial** · **Gap** (PRD asks for it, code does not show it) · **Not available** (depends on something the backend lacks and the PRD allows for that) · **Backend-dependent** (cannot be judged from the frontend).

## Partner Portal – PRD §13 (Phase 2)

| ID | PRD ref | Requirement (abridged) | Where in code | Evidence | Status | Note |
|---|---|---|---|---|---|---|
| P-01 | §13 Partner access | Secure sign-in and password reset | `partner/pages/PartnerLoginPage.tsx`, shared Forgot/Reset pages, `PartnerActivatePage.tsx` | CODE; tests `partnerAuth.test.tsx`, `activation.test.tsx` (mocked, RUN) | Implemented | |
| P-02 | §13 | MFA for privileged users; consider for partners | `PartnerLoginPage.tsx`, `PartnerSecurityPage.tsx`, `partnerSettingsService.ts` | CODE (MFA code paths present in all three; each sub-flow such as enrol / disable / recovery codes not individually traced; the API matrix DOC lists them as integrated) | Implemented | Partner MFA is optional, which matches "consider for partners". |
| P-03 | §13 | Role-based access | `partner/components/PartnerRoute.tsx` | CODE | Implemented | UI guard only; the backend enforces organisation isolation (code comment). |
| P-04 | §13 | Session expiry | `authStore.ts` (`sessionExpired` flag), `guards.tsx`, `SessionExpiredPage` | CODE (flag and page read; the exact trigger path was not traced) | **Partial** | Expiry appears to be reactive (a `sessionExpired` flag routes to the expired page). A keyword scan for idle / inactivity / auto-logout found **no idle-timeout** code. Token lifetime is a backend setting (NONE). |
| P-05 | §13 | Partner profile and application status view | `PartnerCompanyPage.tsx`, `PartnerApplicationPage.tsx` | CODE | Implemented | |
| P-06 | §13 Dashboard | Company profile and completion indicator | `PartnerCompanyPage.tsx` ("Profile completion" card, `GET /partner/organization/completion`) | CODE | Implemented | |
| P-07 | §13 | Application status and reviewer messages | `PartnerApplicationPage.tsx`, `PartnerMessagesPage.tsx`, `utils/applicationStatus.ts` (covers the six allocation stages) | CODE | Implemented | |
| P-08 | §13 | Submitted documents | `PartnerDocumentsPage.tsx`, `partnerDocumentService.ts` (upload, new version, history, download) | CODE | Implemented | |
| P-09 | §13 | Additional document requests | `usePartnerDocuments.ts` (`GET /partner/document-requests`) | CODE | Implemented | `GET /partner/document-requests/{id}` is not called (list is enough for the UI). |
| P-10 | §13 | Notifications | `PartnerNotificationsPage.tsx` (read, unread, read-all) | CODE | Implemented | |
| P-11 | §13 | Enquiry history | `PartnerEnquiriesPage.tsx` | CODE | Implemented | Read-only list (search, filter, pagination). The spec offers no detail/create/reply for partners. **File is untracked in git.** |
| P-12 | §13 | Profile update requests | `PartnerProfileChangesPage.tsx`, `ProfileSection.tsx` | CODE (pages exist; endpoint wiring per DOC and the endpoint table) | Implemented | Admin side decides: `features/governance`. |
| P-13 | §13 | Change history | `PartnerProfileChangesPage.tsx`; `GET /partner/organization/history` is in the partner endpoint table | CODE (page exists; call site not traced) | Implemented | |
| P-14 | §13 Document handling | Private storage, access controls, audit logging | Backend (spec text: download is "authorised + audited") | DOC / NONE | Backend-dependent | Cannot be shown from the frontend. |
| P-15 | §13 | File type restriction | `partner/utils/documentFiles.ts` (allow-list PDF, PNG, JPG, DOCX, XLSX; extension/MIME match; empty-file check) | CODE | Implemented | Explicitly a UX pre-check; backend is authoritative. |
| P-16 | §13 | **File size restriction** | none | CODE | **Gap** | No client-side size check; the code comment says "No size limit is documented". The restriction (if any) is invisible to the user. Needs a backend answer. |
| P-17 | §13 | Malware scanning "where available" | Uploads show a "quarantined" state | DOC | Not available | `endpoints.ts` comment: "no malware scanner". The PRD wording allows this, but it should be a conscious, recorded decision. |
| P-18 | §13, §19 | **Retention rules and secure deletion** | Partner `DELETE` is a soft delete; privacy request flow in `features/governance` | CODE / DOC | **Gap / unverified** | The privacy `execute` action is described as anonymising contact data. Nothing in the code shows retention dates or that stored files are physically destroyed. |

## Admin Console – PRD §14 (Phase 3), plus the §19 and §28 obligations that land on staff

| ID | PRD ref | Requirement (abridged) | Where in code | Evidence | Status | Note |
|---|---|---|---|---|---|---|
| A-01 | §14 | Overview | `features/dashboard` (`GET /admin/overview`, KPIs, charts) | CODE | Implemented | |
| A-02 | §14 | Recent activity | `DashboardPage.tsx`: "Recent partner applications", "Recent enquiries" cards | CODE | Implemented (interpretation) | There is **no event-level activity feed** on the dashboard. If "activity" means audit events, that lives only on the Audit pages (super administrator). |
| A-03 | §14 | Partner applications and qualification review | `features/partner-applications`, `application-review` | CODE | Implemented | |
| A-04 | §14 | Business and project enquiries | `features/business-enquiries` | CODE | Implemented | |
| A-05 | §14 | Strategic / M&A enquiries with restricted permissions | `features/strategic-enquiries` pages behind `guarded('strategicEnquiries')` in `app/router.tsx`; "Restricted record" screen in `business-enquiries/pages/EnquiryDetailPage.tsx`; one test, `StrategicGuard.test.tsx` (BDM cannot see a strategic record) | CODE; test not re-read beyond its title | Implemented (UI) | Static role map gives the module to super administrator only. This is a UI hint; backend enforcement is not verified (NONE). Queue owner is an open PRD decision (§25). |
| A-06 | §14 | Partner database | `features/partner-management` | CODE | Implemented | |
| A-07 | §14 | Document review | `features/document-management` (`DocumentQueue.tsx`, review, history) | CODE | Implemented | |
| A-08 | §14 | Lead assignment | `features/lead-assignment` | CODE | Implemented | |
| A-09 | §14 | Follow-ups | `features/follow-ups` (`AllFollowUps.tsx`; create, edit, complete, cancel) | CODE | Implemented | |
| A-10 | §14 | **Communication history** | `CommunicationsPage.tsx` = "Email delivery and templates"; enquiry activity timeline; application messages | CODE | **Partial** | No consolidated per-lead / per-partner communication log. The page itself says "Only metrics the backend exposes are shown." Needs a decision on what "history" must contain. |
| A-11 | §14 | Website pages, insights, content approval | `features/content-management` (draft → in_review → approved → published, versions, schedule) | CODE | Implemented | Structured Homepage / Services / Industries / Media pages are not available (see `STAGE1_02`). |
| A-12 | §14 | User roles with least privilege (4 roles) | `config/permissions.ts` | CODE | Implemented | Static map matches the PRD role table; `/auth/permissions` is consumed with the map as fallback. The map's header comment is stale (see `STAGE1_05`). |
| A-13 | §14 | Notification templates | `communication/pages/TemplatesPage.tsx` | CODE | Implemented | |
| A-14 | §14 | System settings | `features/settings` | CODE | Implemented | |
| A-15 | §14 | Reports and CSV export | `features/reports`, `services/api/csv.ts` | CODE | Implemented | `csv.ts` downloads a server-generated CSV and rejects JSON or empty bodies. Protection against spreadsheet formula injection is a **backend** claim (`endpoints.ts`: "formula-safe CSV"); the frontend does no sanitising itself. Not verified. |
| A-16 | §14 | Audit logs | `features/audit-logs` (list, detail, actions, CSV) | CODE | Implemented | Super administrator only. |
| A-17 | §19 | MFA for administrators and reviewers | `features/auth/pages/LoginPage.tsx` (staged enrol / confirm / verify) | CODE | Implemented | |
| A-18 | §28 | Eligibility: store evidence and reviewer outcome; no auto-approve/reject | `ReviewActions.tsx` (human-entered verified values) | CODE; scan of non-test `src` found no auto-decision code | Implemented | |
| A-19 | §28 | **Display the 3-year / 50-person / INR 2 crore thresholds, conditional by pathway** | none found | CODE | **Gap** | Console shows submitted and verified values only. The thresholds are available from public `GET /catalog/partner-criteria`, which the console does not call. May be intended for the public site; needs confirming. |
| A-20 | §28, §29 | Six allocation stages as separate statuses with timestamps, owners, notes | Backend `PortalStatus` has all six; UI maps all (`partner-applications/utils/format.ts`, `ApplicationReviewsPage.tsx`) | CODE + spec | Implemented | Per-stage owner display not checked. |
| A-21 | §28 | Submission completeness (eight evidence items) | Backend `PartnerDocCategory` has exactly the eight items | spec + CODE | Implemented | "Two client references" is not enforced client-side; relies on the backend readiness check (NONE). |
| A-22 | §19 | Data retention, deletion, correction, access-request processes | `features/governance` (privacy requests, execute) | CODE | Implemented | Same caveat as P-18 about what "execute" destroys. |

## Roll-up (my count; see caveats above)

| | Rows | Implemented | Partial | Gap | Not available | Backend-dependent |
|---|---:|---:|---:|---:|---:|---:|
| Partner Portal (§13) | 18 | 13 | 1 | 2 | 1 | 1 |
| Admin Console (§14 + §19 + §28) | 22 | 20 | 1 | 1 | 0 | 0 |
| **Combined** | **40** | **33** | **2** | **3** | **1** | **1** |

- 33 of 40 rows (82.5%) are implemented **in code**.
- **0 of 40** rows are verified at runtime against a live backend.
- The five rows that need action or a decision are P-04, P-16, P-18, A-10, A-19. P-17 and P-14 need a recorded decision / backend confirmation rather than frontend work.
- Not covered by this repository: PRD §6–§12 public site and its forms. The public website is not in this repo (`PRD_REQUIREMENT_TRACEABILITY_MATRIX.md`, existing doc).
