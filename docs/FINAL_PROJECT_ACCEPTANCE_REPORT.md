# Final Project Acceptance Report – Phase 37 (2026-11-10)

Basis: `Coral_Swift_Complete_Consolidated_Master_PRD.pdf`, this repository, live backend `https://coralswift-backend.onrender.com` (read-only, unauthenticated probes only). Companion files: `PRD_REQUIREMENT_TRACEABILITY_MATRIX.md`, `BACKEND_DEPENDENCY_REGISTER.md`, `CROSS_PORTAL_INTEGRATION_REPORT.md`.

## A. Executive Summary

- **Overview:** Coral Swift is a three-platform ecosystem (Public Website, Admin Console, Partner Portal) on one FastAPI backend. This repository contains **two** platforms: the Admin Console (`/admin/*`) and the Partner Portal (`/partner/*`), one Vite/React 19 SPA with a single Axios client and in-memory auth.
- **Public Website:** **not in this repository and not auditable.** The only site found locally (`Downloads/coralswift-main (1)`) is a different product (Supabase/Next.js "Enterprise Software Architecture" site, no partner pathways, no calls to this backend) that publishes "Officially Partnered by VPD Technologies" and "99.999% SLA Guarantee", which breach the PRD publication gate (§10, §19, §28). It must not be accepted as the PRD site.
- **Overall status:** **Not ready for production.** Code quality gates pass; live behaviour has never been verified.
- **Accomplished:** all 22 admin modules routed and tested against mocked contracts; partner portal for auth, activation, dashboard, profile, documents, application tracking, messages, onboarding (derived, read-only), settings; real backend statuses preserved (no invented `approved`); strategic-route guards; no HTML sinks or web storage; out-of-scope features absent.
- **Fixed / wired this phase:** (1) change-password was disabled in the endpoint registry **and** would have posted the wrong field names; now `POST /auth/change-password` with `{current_password,new_password}`, used by the admin page and a new form on the Partner Security page; (2) Partner Notifications now supports unread markers, Mark read and Mark all as read; (3) Partner Accounts shows a directory of real partner accounts (`GET /admin/accounts`) with resend/revoke invitation, suspend and reactivate behind confirmations. Unit tests added for each.
- **Discovered this phase:** the live backend grew from 115 to **134 paths** since Phase 36 (account management, follow-ups list, transitions table, permissions, partner notification read-state, change-password…). Earlier gap documents are partly stale; see Register Part C.
- **Critical outstanding:** CORS for deployed origin (BDR-O01), no test environment/credentials (BDR-O02), strategic/partner-isolation authorization unverified (BDR-B07), no malware scanning (BDR-B01), no retention/secure deletion (BDR-B02), Public Website unavailable for audit.

## B. Platform Acceptance

| Platform | PRD Coverage | Integration Status | Security Status | Acceptance Status |
|---|---|---|---|---|
| Public Website | Unknown – source absent (22 PRD rows "Requires business clarification") | Endpoints exist; all 4 form endpoints return 403 `BOT_CHECK_FAILED` without `X-Bot-Token` (live); `GET /content` 200 | Unassessable; the local candidate site violates PRD claim rules | **Not accepted – cannot be audited** |
| Admin Console | 22 modules routed; limits documented (CMS depth, server filters, untyped dicts) | Paths match live spec; mocked-tested only; 401 enforced live; authenticated flows unverified | Tokens in memory, guards tested, no HTML sinks; backend role matrix + strategic restriction unverified | **Implemented, not verified live** |
| Partner Portal | Core modules done; projects, team, performance, meetings, discussions are honest "unavailable" states | Same as above; activation/documents/messages mocked-tested | Partner isolation by token design, unverified (needs 2 accounts); internal notes absent from partner payload types | **Partially implemented, not verified live** |

## C. Requirement Coverage (from the 103-row matrix)

| Status | Count |
|---|---|
| Total requirements identified | **103** |
| Complete and verified | 12 |
| Implemented but not fully verified | 40 |
| Partially implemented | 16 |
| Not implemented | 1 |
| Blocked by backend dependency | 9 |
| Requires business clarification | 22 |
| Out of approved scope | 3 |

Platform tags (a row can list several): Admin 55, Partner 41, Public 22, All 7, Backend 7, Ops 2, Business 2. Counts come directly from the matrix rows; "Complete and verified" is deliberately strict (automated test, E2E, live probe or exhaustive static check). The one "Not implemented" row is email-delivery testing (R-092).

## D. Business Workflow Results

Nothing could run live (no credentials, no test mailbox; production data never touched). "Code path" = mocked unit/E2E coverage of each side.

| Scenario | Preconditions | Expected | Actual | Evidence | Status |
|---|---|---|---|---|---|
| A Application → review → eligibility → decision → onboarding | Public submission (bot token), staff reviewer | Real statuses only; decision ≠ onboarding done | Admin + partner sides coded and tested separately; public step unauditable | Unit `derive.test`, `onboarding/derive.test`, `PartnerApplicationPage`; live 403 probe | Not verified end-to-end |
| B Provisioning → invitation → activation → login → dashboard | Authorized admin; invite email | Account only via `POST /reviewer/invitations` | Coded; activation page tested with mocks | `activation.test`, `partnerAuth.test`, `PartnerAccounts.test` | Not verified live |
| C Documents: submit → review → info request → response | Partner + reviewer | Request/response loop | Upload/replace/download + review coded; no due date/status for requests | `PartnerDocumentsPage.test`, `DocumentsPage.test` | Partially supported (BDR-B04) |
| D Communication: admin → partner notice → read → reply | Both roles | Notification, read state, reply | Messages + reply coded; read-state endpoints exist but not wired | `PartnerMessagesPage.test` | Partially supported (BDR-F01) |
| E Business enquiry: intake → assign → follow-up → status | Public intake, BDM | Queue, assignment, follow-up | Admin side coded; intake unauditable | `LeadAssignmentPage.test`, `FollowUpsPage.test` | Not verified end-to-end |
| F Strategic/M&A confidential | Super Admin vs other roles | Restricted access | UI hides for unauthorized roles; backend restriction unverified | `StrategicGuard.test`, `router.test`, E2E redirect | Not verified (BDR-B07) |
| G Project engagement visibility | Admin authorization | Partner sees engagement | No backend entities | `PartnerProjectsPage.test` (unavailable state) | Blocked by backend (BDR-B11) |

## E. Security and Quality

**Automated results (actually run today, 2026-11-10):**

| Check | Result |
|---|---|
| `npm run typecheck` (`tsc -b`) | Pass |
| `npm run lint` (ESLint) | Pass |
| `npm test` (Vitest, mocked API) | **287 / 287 passed**, 42 files |
| `npm run e2e` (Playwright, Chromium desktop + 375 px mobile, mocked network) | **28 passed, 2 skipped** (the skipped tests are the live partner-session test, needing `E2E_*` credentials) |
| `npm run build` | Pass; main chunk 720 kB (218 kB gzip) + recharts 373 kB; >500 kB warning remains |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Live backend | Read-only: `/health` 200, `/openapi.json` 134 paths, `/content` 200; security headers `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`; protected routes 401 without token (Phase 36 probe) |

Mocked tests prove UI logic against the *assumed* contract; they are not live verification.

**Security findings**
- Positive: no `localStorage`/`sessionStorage`/`dangerouslySetInnerHTML`/`innerHTML`/`eval`; single env var; no certification claims; partner payload types contain no internal-note fields; `changed_by` internal ids not rendered; thresholds (3 yr / 50 staff / INR 2 crore) are never compared or enforced in code, only displayed or recorded by reviewers.
- Open (backend): malware scanning, retention/secure deletion, private-storage evidence, authorization matrix, rate limiting/lockout, email authentication evidence.
- Open (frontend/ops): no CSP/host headers for the console host; reload signs users out (by design); no CI pipeline; directory is not under version control.

**Accessibility:** 279 ARIA/role usages, Radix dialogs, labelled login forms and keyboard Tab reachability confirmed by E2E; global reduced-motion rule present. **No axe, contrast or screen-reader audit was run; WCAG 2.2 AA compliance is not claimed.**

**Performance:** routes lazy-loaded; two chunks over 500 kB; Core Web Vitals and large-table behaviour not measured.

## F. Outstanding Issues

| # | Description | Priority | Module | Business impact | Required action | Area |
|---|---|---|---|---|---|---|
| 1 | CORS rejects non-allow-listed origins | 1 | Admin, Partner | Portals unusable from browsers on deployed domain | Allow-list production/staging origins; re-test preflight | Backend / infra |
| 2 | No test environment or credentials | 1 | All | No live acceptance possible | Seed test tenant + mailbox | Infrastructure |
| 3 | Strategic/M&A and partner-isolation authorization unverified | 1 | Admin, Partner | Possible confidentiality breach undetected | Run role/isolation matrix on test env | Backend + QA |
| 4 | No malware scanning; no retention/secure deletion; storage privacy unattested | 1 | Documents | Unscanned financial documents; PRD §13/§19 unmet | Implement scanner, retention, attestation | Backend |
| 5 | Public Website source absent; local candidate violates PRD claim rules | 1 | Public | Whole platform cannot be accepted | Provide canonical repo; remove unverified partner/SLA claims | Business + frontend |
| 6 | Newly live endpoints still unused: account detail and admin password-reset, reviewer transitions, follow-up edit/cancel, enquiry activity, assignees, permissions, criteria catalog | 2 | Admin | Documented gaps remain that the backend could now close | Verify contracts, wire, test | Frontend |
| 7 | Reviewer checklist / exceptions / per-stage records; additional-document requests; onboarding records | 2 | Admin, Partner | PRD §11/§13/§28 workflow only approximated | Backend entities (no auto-scoring) | Backend |
| 9 | CMS depth, server filters, untyped responses, audit CSV | 3 | Admin | Governance/reporting limited | See Register | Backend |
| 10 | No axe/contrast audit, no live E2E, bundle >500 kB, no CI | 3–4 | All | Unproven a11y/performance; manual release risk | Run audits on test env; add CI; chunking | Frontend / infra |
| 11 | Open PRD decisions (brand spelling, criteria applicability per pathway, queue owners, providers, contact details) | 1 | Business | Launch blocked by PRD §28 itself | Business answers | Business |

## G. Production Readiness Decision

**Not ready for production.**

Evidence: (1) the Public Website, one of three platforms and the first release phase (PRD §23), could not be audited and the only local candidate contradicts the PRD; (2) not a single authenticated workflow has been exercised against the live backend; (3) the PRD's confidentiality requirement (strategic/M&A, partner isolation, financial documents) rests on backend authorization that is unverified and on storage controls (scanning, retention) the backend says it lacks; (4) CORS for the deployed origin is unresolved. The code-quality gates are green and out-of-scope features are absent, so the Admin Console and Partner Portal are candidates for *"ready after specified critical fixes"* once items 1–5 and 11 above are closed and Scenarios A–F pass on a test environment.

**Remaining actions before production:** close issues 1–5 and 11; wire Priority-2 newly available endpoints (issue 6); run live Scenarios A–G with seeded accounts; run an accessibility audit; configure hosting (SPA fallback, CSP) and monitoring/backup ownership (PRD §21).
