# Admin Console – PRD Traceability Matrix (Phase 21)

**Source:** `Coral_Swift_Complete_Consolidated_Master_PRD.pdf` (found at `C:\Users\DELL\Downloads\`, read in full via text extraction: 14 pages + 2 addendum pages). Note: the cover says *Version 2.0*, the addendum footer (sections 27–30) says *Version 3.0*; both were treated as one specification. Page refs: `p.N` = main body page; `Add.p.N` = addendum page (sections 27–30, re-numbered 1–2 in the PDF).
**Audit date:** 2026-11-10. **Backend contract source:** live `https://coralswift-backend.onrender.com/openapi.json` fetched 2026-11-10; byte-identical to the Phase 17 snapshot (`.tmp/openapi_p21.json`, 239,264 bytes).
**Method:** code inspection (endpoint registry, permissions, router, services, key pages), OpenAPI diff, automated checks. No authenticated live session was available (no staff credentials/MFA), so **no row is "live-verified"**.

**Status legend.** *Completed* = implemented against a confirmed contract, code-inspected and covered by unit/component tests (live behaviour unverified). *Partial* = part built, or built but with a stated limitation. *Missing* = backend contract exists but the Admin UI does not use it. *Blocked* = backend has no such capability. *N/A* = not an Admin Console concern or not buildable/excluded. **Test evidence "code only"** = inspected, no dedicated automated test.

Columns: PRD ref · Requirement · Type · Module · Route · Implementation evidence · Backend dependency · Status · Test evidence · Gap · Remediation · Priority.

## A. Dashboard

| ID | PRD ref | Requirement | Type | Module | Route | Evidence | Backend | Status | Tests | Gap | Remediation | Pri |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 | §14 p.7 | Overview and recent activity | Mandatory | Dashboard | `/admin/dashboard` | `features/dashboard/*`, `dashboardService.ts` | `GET /admin/overview`, `/admin/reports/kpis` (untyped dict), enquiries/organizations/reviewer lists confirmed | Partial | `DashboardPage.test.tsx`, `transform.test.ts` | Overview/KPI response keys are not in the spec; list-derived widgets read ONE page of ≤100 rows (flagged in UI as possibly truncated). No "recent activity" feed endpoint. | Backend: typed overview + totals; until then keep truncation notice | High |
| A2 | §14 p.7 | Role-appropriate dashboard visibility | Mandatory | Dashboard | same | `useDashboardData.ts` enables each query only if role has the module | `/admin/overview` "scoped to your role" | Completed | `DashboardPage.test.tsx` | – | – | – |
| A3 | §14, §19 p.7/10 | Strategic data excluded from metrics for unauthorised roles | Mandatory | Dashboard | same | **Phase 21:** `select` filter drops `enquiry_type==='strategic'` rows unless `strategicEnquiries` | Backend scoping unverified | Completed (UI layer) | Code only; filter is a one-line predicate | Backend leakage of counts in `/admin/overview` & `/kpis` unverified | Live test with BDM account | High |

## B. Partner applications and review

| ID | PRD ref | Requirement | Type | Module | Route | Evidence | Backend | Status | Tests | Gap | Remediation | Pri |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | §14 p.7 | Application listing/details, search/filter | Mandatory | Partner applications | `/admin/applications` (+`/:id`) | `features/partner-applications` | `GET /reviewer/applications` (status, unassigned, page) | Partial | `format.test.ts` | No server text search/sort; refinement is client-side on loaded page (labelled) | Backend search/sort params | Medium |
| B2 | §11 p.7 | Record reviewer, notes, status, date | Mandatory | Application review | `/admin/application-reviews/:id` | `ApplicationReviewWorkspacePage.tsx`, `reviewEndpoints` | assign, notes, history, transition (confirmed) | Completed | `derive.test.ts` | – | – | – |
| B3 | §11 p.7 | Reviewer assignment | Mandatory | Application review | same | assign action; reviewer list requires super admin | `POST …/assign`; `GET /admin/users?role=` super-admin only | Partial | code only | Non-super reviewers cannot list reviewers (backend limit) | Backend: reviewer-picker endpoint for non-super roles | Low |
| B4 | §11 p.7 | Request missing items; applicant notified | Mandatory | Application review | same | information-request form | `POST …/information-requests` | Completed | code only | Delivery of the notification depends on outbox (see I) | – | – |
| B5 | §11, §28 | Eligibility verification recorded by a human; no auto approve/reject | Mandatory | Application review | same | `ReviewActions.tsx` records outcome with verified values | `POST/GET …/eligibility-verifications` ("no automatic approval or rejection") | Completed | code only | – | – | – |
| B6 | §8 p.5 | Initial submission checklist (8 evidence categories) & document review | Mandatory | Documents | `/admin/documents`, application documents | `document-management/*`, `docReview` | `POST …/documents/{id}/review` | Completed | `documents.test.ts`, `DocumentsPage.test.tsx` | Whether the backend checklist covers all 8 categories is unverified | Live check against `/catalog/partner-criteria` | Medium |
| B7 | §28 Add.p.1 | Six allocation stages as separate statuses with timestamps/owners/notes | Mandatory | Application review | same | status derived from backend `PortalStatus` + `history`; no stage names invented | `POST …/transition` | Partial | `derive.test.ts` | Backend `PortalStatus` values were not mapped 1:1 to the six PRD stages (backend decides); history timestamps shown | Business: confirm stage↔status mapping | Medium |
| B8 | §11 p.7 | Internal notes never visible to partners | Mandatory | Application review | same | separate notes vs messages UI | notes endpoint documented "never visible to partners" | Completed | code only | – | – | – |
| B9 | §8 p.5 | Decision/rejection history | Mandatory | Application review | same | History tab | `GET …/history` | Completed | code only | – | – | – |
| B10 | §15 p.8 / §13 | Profile change requests from partners reviewed by staff | Recommended (portal) | **Governance (new)** | `/admin/governance` | **Phase 21:** `features/governance` | `GET /admin/profile-change-requests`, `POST …/decide` (super admin) | Completed | `GovernancePage.test.tsx` (error state; page render) | Approve/reject path not live-tested; only pending shown | Live test | Medium |

## C. Partner qualification (criteria)

| ID | PRD ref | Requirement | Type | Module | Route | Evidence | Backend | Status | Tests | Gap | Remediation | Pri |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 | §8 p.5, §28 | 3-yr / 50 staff / INR 2 crore are *proposed*, pathway-dependent, never universal | Mandatory | Review/onboarding | – | `grep` finds **no hard-coded** thresholds; reviewer enters *verified* values | `POST …/eligibility-verifications` | Completed | code search | – | – | – |
| C2 | §8, §28 | Pathway distinction (strategic / direct / vendor) | Mandatory | Application review | – | pathway shown from backend fields | pathway fields on application | Partial | code only | Applicability-by-pathway rules are an **open business decision** (§25) | Business decision | Medium |
| C3 | §8 p.5 | Exceptions only via approved process | Mandatory | – | – | No exception UI exists (correctly) | No exception endpoint | Blocked | – | Backend has no exception workflow | Backend + business process | Low |
| C4 | §23 p.13 | No automated final scoring/allocation | Out of scope | – | – | None implemented | – | N/A (compliant) | code search | – | – | – |
| C5 | §8 p.5 | Display proposed criteria clearly to reviewers | Recommended | Review | – | Not shown from catalog | `GET /catalog/partner-criteria` (public) | Missing | – | Endpoint unused by Admin | Show as read-only reference panel | Low |

## D. Onboarding and partner accounts

| ID | PRD ref | Requirement | Type | Module | Route | Evidence | Backend | Status | Tests | Gap | Remediation | Pri |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D1 | §13, user rule | Submit ≠ approve ≠ account ≠ activation | Mandatory | Onboarding | `/admin/approved-applicants`, `/admin/onboarding` | `ProvisioningPanel.tsx`; provisioning is an explicit super-admin action | `POST /reviewer/invitations` | Completed | `derive.test.ts` | – | – | – |
| D2 | §13 | Account activation | Mandatory | Partner accounts | `/admin/partner-accounts` | Activation is partner-side (`/auth/invitations/accept`), not handled in Admin | invitations/accept | Completed (by design) | – | – | – | – |
| D3 | §14 p.7 | Partner database | Mandatory | Partners | `/admin/partners` | `partner-management/*` | `GET /admin/organizations(+/{id})` | Completed | `PartnerPages.test.tsx`, `partners.test.ts` | Detail is an untyped dict | Backend typed schema | Low |
| D4 | §14 | Suspend/reactivate partner | Recommended | Partners | detail | status action with required reason | `POST …/status` (super admin) | Completed | `PartnerPages.test.tsx` | – | – | – |
| D5 | §13 | Partner account list/status/role/invitation state | Recommended | Partner accounts | `/admin/partner-accounts` | Honest unavailable states | none in spec | Blocked | `PartnerAccounts.test.tsx` | No endpoints | Backend | Medium |

## E. Business/project enquiries

| ID | PRD ref | Requirement | Type | Module | Route | Evidence | Backend | Status | Tests | Gap | Remediation | Pri |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E1 | §14, §15B p.7/8 | Listing, detail, type, priority, status, owner, source | Mandatory | Business enquiries | `/admin/enquiries` | `business-enquiries/*` | `GET/PATCH /admin/enquiries(/{id})` with type/status/priority/assigned/unassigned/overdue/sla_breached/q/dates | Completed | `format.test.ts`, `StrategicGuard.test.tsx` | Sort is page-local (no sort param) | Backend sort | Low |
| E2 | §11 | Internal notes/follow-ups with due dates | Mandatory | Follow-ups | `/admin/follow-ups` | `follow-ups/*` | `POST …/follow-ups` `{note,due_at?}`, `…/complete` | Completed | `followUps.test.ts`, `FollowUpsPage.test.tsx` | – | – | – |
| E3 | §15B | Closure/reopen | Optional | Business enquiries | detail | status change via PATCH only | status enum from backend | Completed | code only | Reopen semantics undocumented | – | Low |
| E4 | §20 p.11 | Response/follow-up time (SLA) | Recommended | Enquiries | list filters | `sla_breached`, `overdue` filters | confirmed | Completed | code only | – | – | – |
| E5 | §12, add-on D | Meeting requests: confirm only after real calendar check | Optional (add-on) | Enquiries (type `meeting`) | `/admin/enquiries/:id` | **Phase 21:** `EnquiryActions.tsx` confirm/decline/cancel | `POST /admin/meetings/{id}/confirm\|decline\|cancel` | Partial | `schemas/meeting.test.ts` | Not live-tested; requester notification unverified | Live test | Medium |

## F. Strategic / M&A (confidential)

| ID | PRD ref | Requirement | Type | Module | Route | Evidence | Backend | Status | Tests | Gap | Remediation | Pri |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F1 | §14, §19 | Restricted routes/nav | Mandatory | Strategic | `/admin/strategic-enquiries*` | `ModuleRoute`, `ROLE_MODULES` (super admin only) | backend authority unverified live | Completed (UI) | `router.test.tsx`, `permissions.test.ts` | – | Live 403 test | High |
| F2 | §28 Add.p.1 | Confidentiality in listings/search/filters | Mandatory | Enquiries | `/admin/enquiries` | **Phase 21:** type option removed and strategic rows dropped for unauthorised roles | uses same `/admin/enquiries` | Completed (UI layer) | code only | UI filtering is cosmetic; backend must exclude | Live test | High |
| F3 | same | Detail page | Mandatory | Enquiries | `/admin/enquiries/:id` | **Phase 21:** "Restricted record" guard | – | Completed (UI layer) | `StrategicGuard.test.tsx` | – | – | – |
| F4 | same | Reports, outbox, audit | Mandatory | Reports/Comms/Audit | – | strategic sections hidden; outbox/audit rows redacted by **regex heuristic** | backend marks nothing strategic | Partial | `ReportsPage.test.tsx`, `Communication.test.tsx`, `AuditSettings.test.tsx` | Heuristic can miss/over-match; audit/outbox rows not tagged by backend | Backend: classification flag on audit/outbox rows | High |
| F5 | same | Attachments / downloads | Mandatory | Documents | – | authenticated blob download, never cached | `…/documents/{id}/download` audited | Completed (UI) | `documents.test.ts` | Backend role enforcement unverified | Live test | High |
| F6 | same | Exports excluding strategic | Mandatory | Reports | `/admin/reports` | CSV via backend only | `enquiries.csv` (same filters), `applications.csv` super admin | Partial | `reports.test.ts` | CSV content for non-super roles unverified | Live test | High |
| F7 | §14 | Separate strategic workflow | Recommended | – | – | Not invented | only general enquiry endpoints | Blocked | – | Dedicated queue/owner not in backend | Backend | Low |

## G. Assignment and follow-ups

| ID | PRD ref | Requirement | Type | Module | Route | Evidence | Backend | Status | Tests | Gap | Remediation | Pri |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| G1 | §11, §14 | Assign/reassign/clear owner | Mandatory | Lead assignment | `/admin/lead-assignment` | `lead-assignment/*`; success only after 2xx | `POST …/assign {user_id|null}` | Completed | `assignment.test.ts`, `LeadAssignmentPage.test.tsx` | Assignee picker needs super-admin user list | Backend picker endpoint | Medium |
| G2 | §15B | Assignment history | Recommended | Lead assignment | – | not shown | none | Blocked | – | – | Backend | Low |
| G3 | §11 | Follow-up schedule/complete/overdue | Mandatory | Follow-ups | `/admin/follow-ups` | see E2 | confirmed | Completed | tests above | – | – | – |
| G4 | §14 | Discussion/communication history | Mandatory | Discussions | `/admin/discussions` | `discussions/*`, `follow-ups/services` | no dedicated thread endpoint | Partial | code only | Communication history is limited to what enquiry follow-up/note endpoints return (not code-verified in detail) | Backend threads | Medium |

## H. Documents

| ID | PRD ref | Requirement | Type | Module | Route | Evidence | Backend | Status | Tests | Gap | Remediation | Pri |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| H1 | §13, §19 | Private storage, no public URLs | Mandatory | Documents | – | blob download with Bearer; no URL persisted | docs: "no public URLs exist" | Completed | `documents.test.ts` | Storage config is backend | – | – |
| H2 | §19 | Downloads audited | Mandatory | Documents | – | Downloads go through audited endpoints | spec "audited" | Completed (UI); audit visible in logs | code only | – | – | – |
| H3 | §19 | Upload type/size limits | Mandatory | CMS attachment (only Admin upload) | content editor | 413/415 surfaced | attachment endpoint | Completed | `ContentManagement.test.tsx` | – | – | – |
| H4 | §13, §19 | Malware scanning "where available" | Recommended | – | – | **No claim made in UI** | spec: "no malware scanner configured", docs quarantined | Blocked | code search | Scanner not configured | Ops decision | Medium |
| H5 | §19 | Retention and secure deletion | Mandatory | Governance | `/admin/governance` | **Phase 21:** execute deletion (anonymise contact data) for privacy requests | `POST /admin/privacy-requests/{id}/execute` | Partial | `GovernancePage.test.tsx` | Document retention dates / secure file deletion have no Admin endpoint | Backend + retention policy (open decision) | High |

## I. Communication

| ID | PRD ref | Requirement | Type | Module | Route | Evidence | Backend | Status | Tests | Gap | Remediation | Pri |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| I1 | §21 p.12 | Delivery status, failed handling | Mandatory | Communications | `/admin/communications/delivery` | `communication/*`; statuses pending/sent/logged/failed shown as returned | `GET /admin/notifications` | Completed | `Communication.test.tsx` | `logged` ≠ delivered; UI never says "delivered" | – | – |
| I2 | §21 | Retry | Recommended | Communications | same | retry + dispatch | `POST …/retry`, `/dispatch` (202 counts only) | Completed | tests above | – | – | – |
| I3 | §14 | Notification templates | Mandatory | Communications | `/admin/communications/templates` | edit/preview/revert | confirmed | Completed | tests above | – | – | – |
| I4 | §14 | In-app notification feed, ad-hoc email, preferences | Recommended | – | – | Honest "not available" pages | none | Blocked | `Communication.test.tsx` | – | Backend | Low |
| I5 | user rule | Notes ≠ external comms | Mandatory | Review/Enquiries | – | separate internal-note vs partner-message UI | – | Completed | code only | – | – | – |

## J. Users, roles, MFA

| ID | PRD ref | Requirement | Type | Module | Route | Evidence | Backend | Status | Tests | Gap | Remediation | Pri |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| J1 | §14 | Staff invite/role/activate/deactivate | Mandatory | Users | `/admin/users` | `user-management/*` | confirmed (super admin) | Completed | `UserManagement.test.tsx` | no pagination/search/GET-by-id | Backend | Low |
| J2 | §14 | Four roles, least privilege | Mandatory | Roles | `/admin/roles` | `permissions.ts` | role names only; no permission matrix API | Partial | `permissions.test.ts` | Module map is a UI hint derived from PRD wording; BD manager lacks `partners`, reviewer lacks `enquiries` (PRD-consistent, not backend-confirmed) | Backend permission matrix | Medium |
| J3 | §19 p.10 | MFA for admins/reviewers | Mandatory | Auth | `/login` | enrol/verify/recovery-code login flow | `/auth/mfa/*` | Completed | code only (no auth tests) | Live MFA unverified | Live test | High |
| J4 | §19 | MFA reset after lost device | Recommended | Users | detail | action present | `…/mfa-reset` | Completed | `UserManagement.test.tsx` | – | – | – |
| J5 | §19 | Own session list/revoke, recovery-code rotation | Recommended | My account | – | not built | `GET/DELETE /auth/sessions`, `POST /auth/mfa/recovery-codes` | Missing | – | Useful security hygiene | Add to Security page | Medium |
| J6 | §13 | Change password (authenticated) | Recommended | Auth | `/admin/change-password` | page shows unavailable | none | Blocked | – | – | Backend | Low |
| J7 | §19 | Session handling | Mandatory | Auth | – | tokens in memory; refresh single-flight; reload = sign-out | opaque tokens in body | Partial | `errors.test.ts` | Memory-only sessions force re-login on reload (secure but inconvenient) | Backend HttpOnly cookie | Low |

## K. Content management

| ID | PRD ref | Requirement | Type | Module | Route | Evidence | Backend | Status | Tests | Gap | Remediation | Pri |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| K1 | §14, §15H | Draft→review→approved→published workflow, version history, unauthorised publish prevented | Mandatory | Website CMS | `/admin/website*` | `content-management/*` | content actions + versions; approve/reject super admin | Completed | `ContentManagement.test.tsx` | – | – | – |
| K2 | §28 | Claims register / publication gate | Mandatory | CMS | claims page | `ClaimsPage.tsx` | `/admin/content-claims` | Completed | tests above | – | – | – |
| K3 | §15E | Publication scheduling, media library, SEO, homepage | Recommended | CMS | – | unavailable pages | none | Blocked | – | – | Backend | Low |
| K4 | §28 | Page owner/reviewer/last-reviewed | Recommended | CMS | – | not shown | no fields in spec | Blocked | – | – | Backend | Low |

## L. Reports and KPIs

| ID | PRD ref | Requirement | Type | Module | Route | Evidence | Backend | Status | Tests | Gap | Remediation | Pri |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L1 | §20 p.11 | Qualified enquiries by category/source; conversion; response time; completion rate; initial-criteria share | Mandatory | Reports | `/admin/reports*` | `reports/*` uses `/reports/kpis` + paged enquiry data, date filters, inverted-range validation | `/reports/kpis` untyped; enquiries list | Partial | `reports.test.ts`, `ReportsPage.test.tsx` | Aggregates built from ≤ loaded pages are labelled partial; KPI keys unverified | Backend typed KPIs with totals | High |
| L2 | §20 | Portal adoption, document review turnaround | Recommended | Reports | – | not available | no endpoint | Blocked | – | – | Backend | Low |
| L3 | §20 | No invented targets | Mandatory | Reports | – | no targets present | KPI endpoint says "No targets" | Completed | code search | – | – | – |
| L4 | §14 | CSV export | Mandatory | Reports | – | enquiries/applications CSV | confirmed (10,000-row cap) | Completed | `reports.test.ts` | newsletter CSV not exposed | Add if needed | Low |

## M. Audit and governance

| ID | PRD ref | Requirement | Type | Module | Route | Evidence | Backend | Status | Tests | Gap | Remediation | Pri |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M1 | §19 | Audit trail: access, status changes, downloads, admin actions | Mandatory | Audit logs | `/admin/audit-logs` | `audit-logs/*`, filters, redaction | `GET /admin/audit` super admin | Completed | `AuditSettings.test.tsx` | no search/export/outcome/IP | Backend | Medium |
| M2 | §19 | Data access/correction/deletion request process | Mandatory | **Governance (new)** | `/admin/governance` | **Phase 21** list/start/complete/execute-deletion | `/admin/privacy-requests*` | Completed | `GovernancePage.test.tsx` | Live unverified; "complete" for access/correction records a status, the actual data export/correction is outside the system | Document manual procedure | High |
| M3 | §28 Add.p.2 | Launch gates (contact, queue owners) | Mandatory | **Governance (new)** | same | **Phase 21** read-only report of `/admin/launch-readiness` | confirmed (untyped) | Completed | `GovernancePage.test.tsx` | Rendered as raw JSON because shape is untyped | Backend typed gates | Low |
| M4 | §14 | System settings | Mandatory | Settings | `/admin/system-settings` | two-step edit, masked secrets | confirmed | Completed | `AuditSettings.test.tsx` | response shape assumed | Live check | Low |

## N. Integrations and operations

| ID | PRD ref | Requirement | Type | Module | Evidence | Status | Gap |
|---|---|---|---|---|---|---|---|
| N1 | §15F | Email provider | Optional | Outbox visible only | Partial | Provider config is backend/ops; no "connected" claim in UI |
| N2 | §15F | CRM / calendar / analytics / support-ticket | Optional/Future | none, no fake screens | N/A | Business decision (§25) |
| N3 | §15H, §21 | Private storage, monitoring, backups, incident response, rollback | Mandatory (ops) | not in Admin scope; `/health*` endpoints exist but unused | Blocked | Ops owners/evidence required; health page optional (Low) |

## O. Non-functional

| ID | PRD ref | Requirement | Status | Evidence / limitation |
|---|---|---|---|---|
| O1 | §16 | Responsive | Partial | Tailwind responsive layouts, tables wrapped in `overflow-x-auto`; **no browser/viewport QA performed** |
| O2 | §16 | WCAG 2.2 AA | Partial | Labels, `sr-only` filters, `scope="col"`, Radix dialogs; no axe/contrast/screen-reader audit performed |
| O3 | §16 | Performance | Partial | Lazy routes; main chunk ~690 kB (219 kB gzip) with build warning |
| O4 | §16 | Security (HTTPS, tokens, XSS) | Completed (code) | https enforced for prod builds; no `dangerouslySetInnerHTML`/eval/web storage (Phase 20 grep); headers/CSP are host config |
| O5 | §16 | Automated tests | Partial | 162 unit/component tests; **no E2E/integration against API** |
| O6 | §16 | Browser compatibility | Not verified | – |
