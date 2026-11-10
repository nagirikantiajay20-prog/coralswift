# PRD Requirement Traceability Matrix – Phase 37

Source: `Coral_Swift_Complete_Consolidated_Master_PRD.pdf` (pages 1–14 "Version 2.0" + gap-closure pages "Version 3.0"; 30 sections). Audit date 2026-11-10.
Code audited: this repository (Admin Console `src/features`, Partner Portal `src/partner`). Live backend: `https://coralswift-backend.onrender.com` (OpenAPI re-fetched today: **134 paths**, 19 more than the Phase 36 snapshot).

## How to read this

**Evidence levels** (nothing here is "live end-to-end verified": no staff/partner credentials or test environment were available, and production data was never modified):
- *Unit/component* = Vitest with mocked API (`npm test`, 287 tests).
- *E2E* = Playwright against the local dev server with mocked network (`npm run e2e`, 28 passed, 2 skipped live tests).
- *Live probe* = unauthenticated, read-only request to the real backend.
- *Static* = source grep/inspection.

**Statuses:** Complete and verified · Implemented but not fully verified · Partially implemented · Not implemented · Blocked by backend dependency · Requires business clarification · Out of approved scope.
"Complete and verified" is used only where an automated test, E2E test, live probe or exhaustive static check demonstrates the requirement. Mocked UI tests alone give "Implemented but not fully verified".

**Public Website:** it is **not in this repository**. The only candidate found on the machine (`Downloads/coralswift-main (1)`) is a *different product* (Next.js + Supabase "Enterprise Software Architecture" site; no partner pathways, no calls to the Render backend, publishes "Officially Partnered by VPD Technologies" and "99.999% SLA Guarantee", which contradict PRD §10/§19/§28). It is not treated as the Coral Swift public website. Every Public requirement is therefore **Requires business clarification** (which codebase is canonical) rather than guessed.

Test file shorthand: `router` = `src/app/router.test.tsx`; `perm` = `src/config/permissions.test.ts`; `SG` = `StrategicGuard.test.tsx`; `e2e` = `e2e/portals.e2e.ts`.

## Matrix

| ID | PRD Section | Requirement | Platform | Implementation Status | Backend Support | Test Evidence | Gap / Action |
|---|---|---|---|---|---|---|---|
| R-001 | §1, §4 | Premium identity: logo, Manrope headings / Inter body, palette tokens | Admin, Partner | Implemented but not fully verified | n/a | Static (fonts `@fontsource-variable/*`, Tailwind tokens, logo asset) | Logo is a raster copy; production SVG/PNG master + approved tokens pending (PRD §25) |
| R-002 | §1, §4 | Same for the public site | Public | Requires business clarification | n/a | None | Site source absent; supply canonical repo |
| R-003 | §4 | Logo on admin login, partner login, emails | Admin, Partner | Partially implemented | Email templates are backend | Static | Email-template branding not inspectable from frontend |
| R-004 | §4 | Reduced-motion respected | Admin, Partner | Complete and verified | n/a | Static: global `@media (prefers-reduced-motion: reduce)` rule in `src/styles/index.css:39` | – |
| R-005 | §3, §25 | Brand spelling "Coral Swift" vs "CoralSwift Technologies" | All | Requires business clarification | n/a | – | Open PRD decision; UI uses "Coral Swift" |
| R-006 | §5, §6 | Sitemap, homepage (hero, six-stage delivery model, pathways, CTAs) | Public | Requires business clarification | `GET /content` live (200, public cache 300s) | Live probe | Site source absent |
| R-007 | §7 | Service pages (IT, Non-IT, Partnership) with use cases, disclaimers | Public | Requires business clarification | `GET /content` | Live probe | Site source absent |
| R-008 | §8 | Show 3 yr / 50 staff / INR 2 crore as *proposed* criteria | Public | Requires business clarification | `GET /catalog/partner-criteria` exists (live) | Live probe | Site absent; admin/partner UIs do not consume this catalog endpoint (see BDR-F03) |
| R-009 | §8, §28 | Three pathways each with distinct CTA and conditional form | Public | Requires business clarification | `POST /enquiries/partner`, `/enquiries/strategic` | Live probe (403 `BOT_CHECK_FAILED` without `X-Bot-Token`) | Site absent; bot-token flow unverified |
| R-010 | §8 | Proposed thresholds not auto-reject; exceptions via internal process | Admin | Complete and verified | n/a | Static: no threshold constants/comparisons anywhere in `src`; turnover/headcount are displayed and *verified values recorded by a reviewer* (`ReviewActions.tsx`) | Exception record has no backend endpoint (BDR-B03) |
| R-011 | §8, §25 | Whether criteria apply uniformly or by pathway | All | Requires business clarification | n/a | – | Open PRD decision; UI treats them as informational |
| R-012 | §9 | Project categories labelled illustrative; no live-marketplace | Public | Requires business clarification | – | – | Site absent |
| R-013 | §9 | Opportunity enquiry form (need, scope, volume, skills, timeline, geography, security, docs) | Public | Requires business clarification | `POST /enquiries/project` | Live probe (bot check) | Site absent |
| R-014 | §10, §28 | Do not publish unverified partner names/logos | Public | Requires business clarification | – | Downloads artifact violates it (VPD) | Remove claims if that site is ever adopted |
| R-015 | §10 | Admin/partner UIs expose no unverified partner names | Admin, Partner | Complete and verified | n/a | Static grep for the §10 names: none in `src` | – |
| R-016 | §11 | Enquiry → reference ID, queue routing, acknowledgement, team notification | Public, Admin | Blocked by backend dependency | Backend creates/routs; email delivery unobservable | Admin lists render refs (unit) | Acknowledgement email delivery unverified; needs test mailbox |
| R-017 | §11 | Partner application: criteria review, profile, evidence, consent, submit | Public, Partner | Partially implemented | `POST /enquiries/partner`; portal `PUT /partner/organization`, `POST /partner/applications/{id}/submit` | Unit (`PartnerApplicationPage`, `PartnerCompanyPage`) | Public intake unauditable; portal side mocked-tested only |
| R-018 | §11 | Reviewer records reviewer, notes, status, date, requested docs; notify applicant | Admin | Implemented but not fully verified | `/reviewer/applications/{id}/notes`, `/transition`, `/information-requests` | Unit (`derive.test`, `format.test`) | Live run needs staff credentials |
| R-019 | §11 | Strategic submission restricted, confidential record, alert owner | Public, Admin | Implemented but not fully verified | Backend restriction **not live-verified** (X7) | Unit `SG`, `router`; E2E redirect | Admin side only; backend 403 matrix unverified |
| R-020 | §11 | Staff dashboard: assign owner, status, notes, follow-up; audit trail | Admin | Implemented but not fully verified | `/admin/enquiries/*`, `/admin/audit` | Unit (`LeadAssignmentPage`, `FollowUpsPage`, `AuditSettings`) | Live unverified |
| R-021 | §11 | Six stages tracked as separate statuses with timestamps, owners, notes | Admin, Partner | Partially implemented | Backend statuses: `rejected`, `pilot_onboarding`, `scale_up` + earlier stages; no `approved`; stage-owner/timestamp per stage only via history | Unit (`derive.test`, `onboarding/derive.test`) | Per-stage owner/notes not stored by backend (BDR-B03); mapping to six stages is a derivation |
| R-022 | §11 | No `approved` status invented | Admin, Partner | Complete and verified | Live spec has no `approved` status | Static: only CMS content status and a query-key use the word; dashboard hint says "No 'approved' status in API" | – |
| R-023 | §11, §28 | Application submission does not create an account | Partner | Complete and verified | Accounts only via `POST /reviewer/invitations` | Static + unit (`activation.test`) | – |
| R-024 | §11 | Decision ≠ onboarding complete; onboarding ≠ activation | Admin, Partner | Complete and verified | n/a | Unit (`onboarding/derive.test`, `PartnerOnboardingPage`) | Onboarding view is derived, read-only (BDR-B05) |
| R-025 | §12 | General contact / project / partner / strategic / meeting forms | Public | Requires business clarification | All five endpoints exist; `POST /meetings` ("not a confirmed booking") | Live probe | Site absent |
| R-026 | §12 | Client+server validation, accessible errors, phone/email validation | Admin, Partner | Implemented but not fully verified | Server validation 422 | Unit (zod schemas; `meeting.test`); E2E labelled-form checks | Public forms unauditable |
| R-027 | §12 | File type/size restrictions and secure upload | Admin, Partner | Implemented but not fully verified | 413/415/409/429/422 mapped (`documentFiles.ts`) | Unit (`PartnerDocumentsPage`, `documents.test`) | Limits are backend-enforced; unverified live |
| R-028 | §12 | Submission reference, confirmation screen, duplicate handling, rate limit | Public | Requires business clarification | Backend: bot token, `Idempotency-Key` allowed header | Live probe | Site absent |
| R-029 | §13 | Partner secure sign-in | Partner | Implemented but not fully verified | `/auth/login` (partner role) | Unit `partnerAuth`; E2E (rejected login, outage, redirects) | Live login untested |
| R-030 | §13 | Password reset | Admin, Partner | Implemented but not fully verified | `/auth/password-reset/request|confirm` | Unit (`PartnerSettings`) | Live untested |
| R-031 | §13, §19 | MFA for privileged users; consider for partners | Admin, Partner | Implemented but not fully verified | `/auth/mfa/*` | Unit (`partnerAuth`, `PartnerSettings`) | Live untested; partner MFA policy = business decision |
| R-032 | §13 | Session expiry | Admin, Partner | Implemented but not fully verified | Backend token expiry; `GET/DELETE /auth/sessions` exist | Unit (axios 401 → expire; `errors.test`); E2E | Partner session list/revoke built; Admin Console has none (BDR-F04); expiry duration unverified |
| R-033 | §13 | Partner role-based access | Partner | Blocked by backend dependency | No partner roles in contract; `GET /auth/permissions` now exists | – | BDR-B06 |
| R-034 | §13 | Company profile + completion indicator | Partner | Implemented but not fully verified | `/partner/organization`, `/completion` | Unit (`PartnerCompanyPage`, `PartnerDashboardPage`) | Live untested |
| R-035 | §13 | Application status + reviewer messages | Partner | Implemented but not fully verified | `/partner/applications*`, `/messages` | Unit (`PartnerApplicationPage`, `PartnerMessagesPage`) | Live untested |
| R-036 | §13 | Submitted documents + additional-document requests | Partner | Partially implemented | Documents yes; request as separate resource with due date/status **no** (uses information-requests) | Unit (`PartnerDocumentsPage`, `PartnerPhase32`) | BDR-B04 |
| R-037 | §13 | Notifications and enquiry history | Partner | Implemented but not fully verified | `GET /partner/notifications` (email rows), `/partner/enquiries`; read-state endpoints (`POST …/read`, `/read-all`) **wired in Phase 37** | Unit (`PartnerMessagesPage.test`: mark one / all) | Live untested; no preferences endpoint |
| R-038 | §13 | Profile update requests and change history | Partner | Implemented but not fully verified | `/partner/organization/change-requests`, `/history` | Unit (`PartnerCompanyPage`) | Live untested |
| R-039 | §13, §19 | Private document storage, audit logging, access control | Partner, Admin | Implemented but not fully verified | Download via authenticated blob; backend storage not inspectable | Static (blobs never persisted); unit | Storage privacy is a backend claim (BDR-B08) |
| R-040 | §13, §19 | Malware scanning where available | All | Blocked by backend dependency | Backend states none configured | – | BDR-B01 |
| R-041 | §13, §19 | Retention rules and secure deletion | All | Blocked by backend dependency | Soft delete only | – | BDR-B02 |
| R-042 | §14 | Dashboard overview and recent activity | Admin | Implemented but not fully verified | `/admin/overview`, `/reports/kpis` (untyped) | Unit (`DashboardPage`, `transform.test`) | Untyped keys; live unverified |
| R-043 | §14 | Partner applications and qualification review | Admin | Implemented but not fully verified | `/reviewer/applications*` | Unit (`derive.test`, `format.test`) | Search/sort/date filters client-side only (BDR-B10) |
| R-044 | §14 | Eligibility verification recording | Admin | Implemented but not fully verified | `/eligibility-verifications` | Static (`ReviewActions.tsx`) | Live unverified |
| R-045 | §14 | Decision management (`rejected`/`pilot_onboarding`/`scale_up`, not auto) | Admin | Implemented but not fully verified | `/transition` (+ new `GET /reviewer/transitions` not yet consumed) | Unit | BDR-F02: use backend transition table |
| R-046 | §14 | Reviewer checklist and scoring storage; "automated final scoring" excluded | Admin | Blocked by backend dependency | No checklist/score endpoint | – | BDR-B03 |
| R-047 | §14 | Business and project enquiries | Admin | Implemented but not fully verified | `/admin/enquiries*` | Unit (`format.test`, `LeadAssignmentPage`) | Live unverified |
| R-048 | §14 | Strategic/M&A restricted enquiries | Admin | Implemented but not fully verified | Backend authz unverified (X7) | Unit `SG`, `router`, `strategic.test`; E2E guard | BDR-B07 live 403 matrix |
| R-049 | §14 | Partner database + document review | Admin | Implemented but not fully verified | `/admin/organizations`, `/reviewer/.../documents/*/review` | Unit (`PartnerPages`, `DocumentsPage`) | Live unverified |
| R-050 | §14 | Lead assignment, follow-ups, communication history | Admin | Implemented but not fully verified | Assign/follow-ups yes; new `/admin/assignees`, `/admin/follow-ups`, `…/activity` partly unused | Unit (`LeadAssignmentPage`, `FollowUpsPage`) | BDR-F02 follow-up of new endpoints |
| R-051 | §14 | Website pages, insights, content approval | Admin | Partially implemented | One `content` resource (article/faq/page/resource) + claims register; no page-tree/media/SEO | Unit (`ContentManagement`) | BDR-B09 |
| R-052 | §14 | User roles, notification templates, settings | Admin | Implemented but not fully verified | `/admin/users`, `/notification-templates`, `/settings`, `/security-policy` | Unit (`UserManagement`, `AuditSettings`, `Communication`) | Live unverified |
| R-053 | §14 | Reports and CSV export | Admin | Implemented but not fully verified | `/admin/reports/*` incl. `enquiries.csv` | Unit (`ReportsPage`, `reports.test`) | Audit CSV export absent in backend |
| R-054 | §14, §15H | Audit logs | Admin | Implemented but not fully verified | `/admin/audit` | Unit (`AuditSettings`) | Server filters limited (BDR-B10) |
| R-055 | §14 | Four roles (Super Admin, BDM, Partner Reviewer, Content Admin) least privilege | Admin | Implemented but not fully verified | Backend enforces; UI is a hint | Unit `perm`, `router` | Backend 403 matrix unverified; new `/auth/permissions` not consumed |
| R-056 | §14 | Admin authentication + MFA | Admin | Implemented but not fully verified | `/auth/*` | Unit (router); E2E | Live untested |
| R-057 | §14 | Admin change password | Admin | Implemented but not fully verified | `POST /auth/change-password` (**live today**) | Unit `changePassword.test`, `PartnerSettings.test` (new, payload contract) | **Fixed this phase** (endpoint was disabled; payload now `{current_password,new_password}`); also added to the Partner Security page; live untested |
| R-058 | §14 | Partner account provisioning via authorized invitation only | Admin | Implemented but not fully verified | `POST /reviewer/invitations` | Unit (`PartnerAccounts.test`) | Account directory and resend/revoke/suspend/reactivate wired behind confirmations (`GET/POST /admin/accounts*`); live untested (BDR-F02) |
| R-059 | §14 | Invitation / activation | Partner | Implemented but not fully verified | `/auth/invitations/accept` | Unit `activation.test` | Email delivery untested |
| R-060 | §15B | Conditional forms, lead source/priority/owner/status/next follow-up | Public, Admin | Partially implemented | Fields partly in backend | Unit | Site absent; priority missing on applications |
| R-061 | §15B | Automatic routing to BD / reviewer / restricted strategic queue | Backend | Blocked by backend dependency | Not observable from frontend | – | Needs staging verification |
| R-062 | §15C | FAQ & knowledge centre | Public, Admin | Partially implemented | `content` type `faq` managed in admin | Unit (`ContentManagement`) | Public site absent |
| R-063 | §15D | Meeting scheduling (confirm only after real booking) | Public, Admin, Partner | Partially implemented | `POST /meetings` + `/admin/meetings/{id}/confirm|decline|cancel`; no partner meeting list | Unit (`meeting.test`, `PartnerPhase32`) | Calendar integration out of reach; partner meetings BDR-B11 |
| R-064 | §15E | Resource centre (articles, downloads, tags, approval) | Admin | Partially implemented | Content workflow draft→in_review→approved→published | Unit (`ContentManagement`) | Tags/search/newsletter absent in backend |
| R-065 | §15F | CRM / email / storage / calendar / analytics integrations | Backend | Requires business clarification | Provider choices open (PRD §25) | – | Decision needed |
| R-066 | §15G | Time zone / currency references | Public | Requires business clarification | – | – | Site absent |
| R-067 | §15H | Audit trail and access logs | Admin | Implemented but not fully verified | `/admin/audit` | Unit | See R-054 |
| R-068 | §15H | Content approval workflow | Admin | Implemented but not fully verified | Statuses + claims register | Unit (`ContentManagement`) | Live unverified |
| R-069 | §15H | Data retention and deletion controls | Backend | Blocked by backend dependency | – | – | BDR-B02 |
| R-070 | §15H | Backups/restore tests, incident process | Ops | Requires business clarification | Infrastructure | – | Named owner + rehearsal needed |
| R-071 | §15H, §19 | Cookie consent / analytics preferences | Public | Requires business clarification | – | – | Site absent |
| R-072 | §15I | Partner directory, capability filters, scorecards, collaboration workspace | Partner, Admin | Out of approved scope | Phase 4 "Could have" | – | Partner performance page is an honest unavailable state (`PartnerPerformancePage`) |
| R-073 | §16 | Responsive: no horizontal overflow | Admin, Partner | Implemented but not fully verified | n/a | **E2E**: login pages at 1280 and 375 px, no overflow | Authenticated pages not browser-tested |
| R-074 | §16 | Performance: lazy loading, caching, bundle | Admin, Partner | Partially implemented | n/a | Build: routes lazy-loaded; main chunk 720 kB (218 kB gzip) + recharts 373 kB (>500 kB warning) | Manual chunking (BDR-F05); Core Web Vitals not measured |
| R-075 | §16 | WCAG 2.2 AA | Admin, Partner | Implemented but not fully verified | n/a | Static: 279 `aria-`/`role` usages, Radix dialogs (59 dialog uses); E2E keyboard Tab + labelled login | No axe/contrast/screen-reader audit run; compliance **not claimed** |
| R-076 | §16, §19 | HTTPS, secure auth, RBAC, validation, rate limits, protected uploads, logging | All | Partially implemented | Backend headers: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` (live) | Live probe; static | Rate-limit/lockout behaviour unverified; no CSP seen |
| R-077 | §16 | Reliability: error handling, outage, retry | Admin, Partner | Complete and verified | n/a | **E2E** backend outage shows error not success (both portals); `errors.test`; `ErrorBoundary` | Retry: React Query defaults only |
| R-078 | §16, §28 | Form failure: no silent failures, preserve data, retry guidance | Admin, Partner | Implemented but not fully verified | n/a | E2E (outage) | Public forms unauditable |
| R-079 | §16 | SEO metadata, sitemap, robots, structured data | Public | Requires business clarification | – | – | Site absent. Admin/Partner SPA correctly ships `<meta name="robots" content="noindex, nofollow">` (`index.html:7`) |
| R-080 | §16 | Maintainability: TS strict, tests, env separation, docs | Admin, Partner | Complete and verified | n/a | `tsc -b` clean; ESLint clean; 287 unit tests; 28 E2E; `npm audit --omit=dev` 0 vulns; single env var `VITE_API_BASE_URL` | No CI pipeline in repo; not under version control (not a git repo) |
| R-081 | §16 | Privacy: collect only necessary data, disclose purposes | Public | Requires business clarification | – | – | Site absent; Partner privacy page exists (`PartnerPrivacyPage`) |
| R-082 | §17 | Tech stack recommendation (Next.js) | All | Out of approved scope | – | – | Stack is a recommendation, not commitment (PRD §17); consoles are Vite/React SPA |
| R-083 | §18 | Data model entities (Company, Contact, Application, Document, Enquiry, Review, Activity, Notification) | Backend | Implemented but not fully verified | Backend owns schema | Live OpenAPI | `Review` checklist/results missing (R-046) |
| R-084 | §19 | Tokens not in web storage; no HTML injection sinks | Admin, Partner | Complete and verified | n/a | Static: no `localStorage`/`sessionStorage`/`dangerouslySetInnerHTML`/`innerHTML`/`eval`; only `console.error` in `ErrorBoundary` | Tradeoff: reload signs out (X10) |
| R-085 | §19 | Backend refuses unauthenticated access | All | Complete and verified | n/a | **Live probe**: `/admin/*`, `/reviewer/*`, `/partner/*`, `/auth/me` → 401 (Phase 36); `/health` 200 | Authenticated authz unverified |
| R-086 | §19 | Internal reviewer notes not exposed to partners | Partner | Implemented but not fully verified | `PartnerMessageOut` has no internal-note field; `changed_by` internal id never rendered | Unit (`PartnerMessagesPage`, `PartnerCompanyPage`); static | Needs a live two-role comparison |
| R-087 | §19 | Partner data isolation | Partner | Implemented but not fully verified | Org derived from token; no org id sent | Static | Needs two partner accounts (BDR-B07) |
| R-088 | §19 | No false certification claims (HIPAA/SOC 2/ISO/PCI) | Admin, Partner | Complete and verified | n/a | Static grep: none | – |
| R-089 | §20 | Analytics events, consent-aware | Public | Requires business clarification | – | – | Site absent |
| R-090 | §20 | Business KPIs (qualified enquiries, completion, response time, turnaround) | Admin | Partially implemented | `/admin/reports/kpis`, report endpoints | Unit (`ReportsPage`, `reports.test`) | Some KPIs need `meta.total`/timestamps (BDR-B10) |
| R-091 | §21 | Automated tests incl. role/permission tests | Admin, Partner | Partially implemented | n/a | Unit `perm`, `router`, `SG`; E2E | No live E2E, a11y, email-delivery or backup tests |
| R-092 | §21 | Email delivery and failure-state testing | Backend | Not implemented | – | – | Needs test mailbox + staging |
| R-093 | §22 | Separate dev/staging/prod environments | Ops | Partially implemented | Dev proxy var vs production URL; build refuses non-https URL | Static (`vite.config.ts`) | No staging backend identified; CORS allow-list missing (BDR-O01) |
| R-094 | §23 | Out of scope: payments, e-signature, marketplace, auto final scoring, public docs, ERP/CRM, regulated processing, guaranteed allocation | Admin, Partner | Out of approved scope | – | Static grep: none implemented (no payment-provider, e-signature, auto-score/reject or marketplace code; Projects page is an unavailable state) | Verified absent |
| R-095 | §24, §28 | Never imply guaranteed allocation | Admin, Partner | Complete and verified | n/a | Static: Projects/Performance pages state functionality unavailable | – |
| R-096 | §28 | Content register: claim → owner → evidence status | Backend, Admin | Partially implemented | Claims register endpoints exist (admin Content) | Unit (`ContentManagement`) | Page owner/reviewer/last-reviewed fields unavailable (BDR-B09) |
| R-097 | §28 | Confidentiality of strategic + financial uploads, excluded from public search | Backend | Implemented but not fully verified | Not observable | – | BDR-B07 |
| R-098 | §28 | Operational service levels, queue owners, escalation | Business | Requires business clarification | – | – | PRD §25 open decision |
| R-099 | §28 | Data minimization: no health/bank account data in public forms | Public | Requires business clarification | – | – | Site absent |
| R-100 | §13 | Partner team / multi-user management | Partner | Blocked by backend dependency | No partner user endpoints | Unit (`PartnerTeamPage` unavailable state) | BDR-B06 |
| R-101 | §13 | Partner project / engagement visibility | Partner | Blocked by backend dependency | No project endpoints | Unit (`PartnerProjectsPage`) | BDR-B11 |
| R-102 | §13 | Partner communication center / discussions | Partner | Partially implemented | Messages + info-request replies; no free discussion threads | Unit (`PartnerMessagesPage`, `PartnerPhase32`) | BDR-B11 |
| R-103 | §29 | Business owner acceptance checklist (brand, facts, claims, criteria, forms, workflow, privacy, ops, launch) | Business | Requires business clarification | – | – | Cannot be signed off by engineering |

## Counts (computed from the table above)

See `FINAL_PROJECT_ACCEPTANCE_REPORT.md` §C (generated from this file by a script, then pasted).
