# Stage 2 – PRD Clarification and Approval Report

Date: 2026-11-11 · **Audit and analysis only.** No source file was modified, deleted, renamed or moved. Nothing was deployed. No backend or API call was made and no credentials were used. The only change in the repository is this new report file (untracked, not committed).

Sources: the PRD text extracted at `.tmp/prd.txt` (read in full this session), `docs/STAGE1_01`–`05`, and the code files named below.

Evidence tags: **CODE** = read this session · **PRD** = quoted from the PRD text · **DOC** = existing repo document, not re-verified · **NONE** = cannot be known from the frontend.

---

## 1. Confirmed PRD scope

### 1.1 What the PRD itself says

| Area | PRD basis | Class |
|---|---|---|
| Partner Portal | §13, §23 "Phase 2 – Should have" | **Mandatory for this deliverable** (should-have, not must-have) |
| Admin Console | §14, §23 "Phase 3 – Should have" | **Mandatory for this deliverable** (should-have) |
| Security and privacy duties on both portals | §19 | Mandatory |
| Acceptance-level details (eligibility, six stages, completeness, confidentiality) | §28, §29 | Mandatory **if** Version 3.0 is approved (see §2) |
| Optional add-ons A–H | §15 A–H | Optional |
| Phase 4 | §15I, §23 "Phase 4 – Could have" | Phase 4 |
| Out of scope unless separately approved | §23 | Payment processing; contract e-signature; live project marketplace; automated partner scoring that makes final decisions; public disclosure of partner documents; full ERP/CRM replacement; regulated healthcare/financial processing; guaranteed project allocation |
| Public website, five forms | §5–§12, §23 Phase 1 | **Not in this repository.** Cannot be accepted from here |

Note on priority: §23 labels Phases 2 and 3 "Should have", Phase 1 "Must have" and Phase 4 "Could have". "Mandatory" in this report means "named in §13/§14/§19 as something the portal does", not "must-have release priority".

### 1.2 Document status

The PRD cover says **"Status: Draft for business and technical validation."** (PRD) The text contains no approval record, sign-off or approver name. The instruction "approved PRD" is therefore taken from you, not from the document. §25 lists ten open decisions "before development"; this report cannot tell which were answered.

### 1.3 Unresolved business decisions (PRD §25 and §28–§29)

| # | Decision | Affects |
|---|---|---|
| BD-1 | Do 3-year / 50-personnel / INR 2 crore apply uniformly or per pathway? (§25, §29 "Criteria") | A-19 |
| BD-2 | Who owns general, project, partner and **confidential strategic** queues? (§25, §28 "Operational service levels", §29 "Operations") | A-05, role map |
| BD-3 | Privacy and retention policy, retention schedule (§25, §29 "Privacy/security") | P-18, A-22 |
| BD-4 | Approved public partner document list (§25) | P-16, completeness |
| BD-5 | Hosting, email, CRM, calendar, file-storage providers (§25) | P-14, P-17, optional add-ons |
| BD-6 | Session / idle-timeout policy (§13 says "session expiry" without a duration) | P-04 |
| BD-7 | File size limit (§13, §19 say "restrict … sizes" without a number) | P-16 |
| BD-8 | What "communication history" must contain (§14) | A-10 |
| BD-9 | Whether the PRD is Version 2.0, 3.0 or both (see §2) | A-19–A-21 and all §28 items |

---

## 2. PRD version clarification (2.0 vs 3.0)

### 2.1 Facts (PRD)

- Cover and the footers of pages 1–14 say **"Version 2.0 – Consolidated master PRD"**.
- §27 ("Corporate Profile-to-PRD Traceability") is the last section of the v2.0 page run.
- §28–§30 are footed **"CONSOLIDATED MASTER PRD | VERSION 3.0"** with page numbering restarting at 1–2.
- §30 says: "This PDF is the **single consolidated master PRD**. It combines … the traceability and gap-closure requirements above. Developers should work from this document as one specification and manage approved changes through a versioned backlog."
- §28 says the list is "**now** made explicit as acceptance-level details so they are not lost".

### 2.2 Reading

The addendum describes itself as part of the same single document, and §30 tells developers to treat the whole file as one specification. The 2.0/3.0 footers look like a pasted addendum that kept its own footer, not two competing documents. But the cover still says Draft, and nobody has recorded that 3.0 was approved. I will not assume it either way.

### 2.3 Consequences of each interpretation

| Item | If **3.0 binds** (whole file is the spec) | If **only 2.0 binds** (§28–§30 are advisory) |
|---|---|---|
| A-19 display thresholds, conditional by pathway | Mandatory | Optional. §8 only says to "display them clearly" as proposed criteria (arguably the public site) |
| A-20 six allocation stages as separate statuses with timestamps, owners, notes | Mandatory (already mapped in code) | Still implied by §11 "Application and project evaluation workflow" and §27 row "Six-step project allocation" ("Implement as partner review workflow and reviewer checklist") |
| A-21 eight-item completeness | Mandatory | Still stated in §8 and §27 |
| A-18 no auto-approve / auto-reject | Mandatory | Still implied by §23 (automated scoring out of scope) |
| Content register, publication gate, contact readiness, SLAs (§28) | Mandatory | Not required |
| Confidential strategic submissions "excluded from public search" | Mandatory | §14 "more restrictive permissions" still applies |
| Acceptance checklist §29 | Governs sign-off | No formal sign-off checklist |
| Effect on this project | A-19 becomes a real gap; BD-1 must be answered | A-19 drops out; everything else is unchanged |

**Recommendation:** treat the file as one specification (3.0 binding), because §30 says so and the cost is small (almost all §28 items are already in code). Obtain a one-line written confirmation from the product owner. Until then, report A-19 as **"mandatory if 3.0 binds; not mandatory under 2.0"** and do not build it.

---

## 3. Validation of the reported gaps

Common caveat: **no authenticated backend call has been made**, so "backend-dependent" means the frontend cannot prove it. "Mandatory" is the PRD reading, not my preference.

### P-04 – Session expiry

- **PRD:** §13 "Role-based access and session expiry." §19 "secure cookie/session settings". No duration or idle rule is given.
- **Evidence (CODE):** `store/authStore.ts` has `sessionExpired` (set on a failed refresh); `services/api/client.ts` handles 401 by single-flight refresh (`/auth/refresh`) and calls the expiry handler; `guards.tsx` routes to the session-expired page. Refresh token is mirrored to per-tab `sessionStorage`. No idle/inactivity timer found in non-test code (grep of `idle|inactiv` hits only unrelated files).
- **Mandatory?** Yes, "session expiry" is named. The *requirement as written is met* by token expiry plus the expired-session page.
- **Dependency:** backend (token lifetime) for the actual expiry; frontend only for an optional idle warning.
- **Business decision:** BD-6 (is token expiry enough, or is an idle timeout wanted?).
- **Recommendation:** reclassify **Partial → Implemented (reactive), pending BD-6**. Build an idle timeout only if the owner asks for one.
- **Acceptance:** with a short-lived or revoked token, the next protected request lands on the expired-session page, tokens are cleared, and sign-in returns to the same portal. If idle timeout is approved: warning at a stated time, auto sign-out, unsaved-form behaviour defined.

### P-14 – Private storage, access control, audit logging of documents

- **PRD:** §13 "stored privately, not in public web folders … access controls, audit logging"; §19 "audit logs for access, … downloads".
- **Evidence:** frontend only uses authorised download endpoints (DOC; CODE: no public file URLs seen in `partnerDocumentService.ts` / `DocumentQueue.tsx`; not re-traced line by line). Storage and logging are backend behaviour.
- **Mandatory?** Yes. **Backend-dependent (100%).** Frontend cannot satisfy or prove it.
- **Decision:** BD-5 (storage provider).
- **Recommendation:** no frontend work. Obtain written backend confirmation, then verify at runtime that a download creates an audit record visible on the audit page.
- **Acceptance:** a download by a reviewer and by the owning partner each creates an audit entry (actor, document, time); an unauthenticated or other-organisation request is refused; no document URL is publicly fetchable.

### P-16 – File size restriction

- **PRD:** §13 and §19 "Apply file type and size restrictions"; §12 "File size/type restrictions".
- **Evidence (CODE):** `partner/utils/documentFiles.ts` `validateFile` checks extension, MIME and empty file only. Its comment: "No size limit is documented." No size message exists.
- **Mandatory?** Yes (restriction is required); the *number* is not in the PRD.
- **Dependency:** **backend** defines the limit and enforces it; **frontend** only needs a pre-check and a readable error. The frontend cannot invent the limit.
- **Decision:** BD-7 / BD-4.
- **Recommendation:** ask the backend owner for the limit and the error shape. Then add a pre-check and message (small). Do not hard-code a guess.
- **Acceptance:** a file above the limit is rejected before upload with the limit stated; a backend rejection also shows a clear message; both partner and staff uploaders behave the same.

### P-17 – Malware scanning

- **PRD:** §13 and §19 "malware scanning **where available**", "scan files where available"; §17 "scanning" for storage.
- **Evidence:** UI shows a "quarantined" state (DOC). `config/endpoints.ts` comment says there is no scanner (DOC).
- **Mandatory?** **No, conditional.** The PRD explicitly allows "where available".
- **Dependency:** backend / infrastructure. **Decision:** BD-5, and the owner should record "not available at launch" explicitly.
- **Recommendation:** no code. Record the decision in the risk register; revisit when a provider is chosen.
- **Acceptance:** a written decision exists; the UI does not claim files are "scanned" anywhere.

### P-18 / A-22 – Retention and secure deletion; retention/deletion/correction/access processes

- **PRD:** §13 "retention rules and secure deletion"; §19 "Define data retention, deletion, correction and access-request processes"; §15H "Data retention and deletion controls" (optional add-on); §25 retention policy is an open decision.
- **Evidence (CODE):** `features/governance/pages/GovernancePage.tsx` lists privacy requests (access, correction, deletion) with status handling and an "Execute deletion" action. Its own confirmation text: backend "will anonymise contact data … cannot be undone and is audited. Legal retention duties are not checked here." `PartnerPrivacyPage.tsx` lets a partner raise requests; its comment says nothing is deleted by the frontend. Partner document delete is soft (DOC).
- **Mandatory?** The *processes* (request, review, execute) are mandatory under §19. A retention *schedule* and *physical file destruction* depend on a policy that does not yet exist.
- **Dependency:** mostly **backend and policy**. Frontend workflow exists.
- **Decision:** BD-3.
- **Recommendation:** A-22 → Implemented in code (workflow). P-18 → **Blocked on policy and backend**, not on frontend. Do not build retention-date UI until the schedule exists.
- **Acceptance:** an approved retention schedule exists; the backend owner states in writing what "execute" removes (contact data, documents, files in storage); a runtime test on non-production data shows the stated result and an audit entry.

### A-10 – Communication history

- **PRD:** §14 "Lead assignment, follow-ups and **communication history**" (one phrase, no definition). §18 has Notification (recipient, template, delivery status) and Activity entities.
- **Evidence (CODE):** `CommunicationsPage.tsx` (email delivery and templates, "Only metrics the backend exposes are shown"), delivery tracking page, enquiry activity timeline, application messages, staff notification feed.
- **Mandatory?** Yes, named. What counts as "history" is undefined.
- **Dependency:** *possibly* backend (a unified per-record log resource). Frontend can already show three of the four likely sources per record.
- **Decision:** BD-8.
- **Recommendation:** classify **Partial (definition unresolved)**. Ask the owner for one sentence: "history means ___ per enquiry/application." If it means "everything sent to or from this record", check whether enquiry detail and application detail already show it before asking for new backend work.
- **Acceptance (once defined):** for a sample enquiry and a sample application, a reviewer can see every email sent (with delivery status), every note/message, and status changes in time order, without leaving the record.

### A-19 – Display thresholds by pathway

- **PRD:** §8 (public criteria; "display them clearly as proposed criteria"); §28 "Eligibility rules engine: **Display** the proposed … thresholds … with conditional applicability by pathway. Store evidence and reviewer outcome; do not auto-approve or auto-reject".
- **Evidence (CODE):** grep of non-test `src` finds no threshold display. Reviewer form (`ReviewActions.tsx`) stores human-entered verified values. Public `GET /catalog/partner-criteria` exists but is unused by the console (DOC; grep confirms only docs mention it).
- **Mandatory?** **Only if 3.0 binds**, and §8 may refer to the public site. Older repo doc `ADMIN_CONSOLE_PRD_TRACEABILITY.md` already classed it "Recommended" (C5).
- **Dependency:** frontend (read-only panel); data source exists. **Decision:** BD-9 first, then BD-1 (which pathway each threshold applies to, otherwise "conditional by pathway" cannot be displayed correctly).
- **Recommendation:** **do not build yet.** If 3.0 is confirmed and BD-1 answered, add a read-only reviewer reference panel fed by `/catalog/partner-criteria`.
- **Acceptance:** the panel shows the three thresholds with the applicable pathway for the application being reviewed; wording says "proposed"; no automatic pass/fail is derived from it.

### A-20 – Six allocation stages as statuses with timestamps, owners, notes

- **PRD:** §11 evaluation workflow; §28 "Project allocation workflow … separate statuses with timestamps, owners and notes"; §29 "Workflow".
- **Evidence (CODE/DOC):** backend `PortalStatus` has all six; `partner-applications/utils/format.ts` and `ApplicationReviewsPage.tsx` map all six; partner side has `utils/applicationStatus.ts` covering the six. Per-stage owner display was not checked.
- **Mandatory?** Yes (both versions imply it). **Dependency:** frontend done; owner/timestamp data is backend. **Decision:** none.
- **Recommendation:** Implemented in code; open check: confirm owner and timestamp per stage are actually shown. Runtime verification needed.
- **Acceptance:** an application moved through each stage shows each stage with date, actor and note on both the staff and the partner view.

### A-21 – Submission completeness (eight evidence items)

- **PRD:** §8 checklist, §27, §28 "Partner submission completeness".
- **Evidence (CODE):** `CATEGORY_LABEL` in `documentFiles.ts` lists exactly the eight categories; backend `PartnerDocCategory` has the same eight (DOC). "Two client references" is not enforced client-side.
- **Mandatory?** Yes. **Dependency:** backend readiness check (NONE). **Decision:** BD-4 (approved document list).
- **Recommendation:** Implemented in code; the "two references" rule is a backend/policy matter. Runtime-verify that a submission missing items is refused or flagged.
- **Acceptance:** submitting with a category missing shows which is missing; the reviewer view shows the same eight categories.

---

## 4. Navigation and feature scope

Classes: **R-OK** required and functional (in code) · **R-INC** required but incomplete · **OPT** optional · **P4** Phase 4 · **OOS** out of scope · **PH** unnecessary placeholder. "Functional" = functional in code; none is runtime verified.

### 4.1 Partner Portal (15 items, `src/partner/config/navigation.ts`)

| Item | Class | Basis | Recommendation |
|---|---|---|---|
| Dashboard | R-OK | §13 dashboard | Keep |
| Application | R-OK | §13 status; §28 workflow | Keep |
| Onboarding | R-OK (not read in detail) | §11 pilot/onboarding, §28 | Keep; confirm contents |
| Company profile | R-OK | §13 profile + completion | Keep |
| Documents | R-OK | §13 documents/requests | Keep |
| Messages | R-OK | §13 reviewer messages | Keep |
| Notifications | R-OK | §13 | Keep |
| Enquiries | R-OK | §13 enquiry history | Keep |
| Profile changes | R-OK | §13 update requests/history | Keep |
| Settings | R-OK | §13 sign-in/MFA; §19 | Keep |
| Follow-ups | R-OK in substance (shows information requests) | §13 "additional document requests" | Keep **only** if the page is the document-request view; otherwise rename "Requests". Do not delete: it may carry a required workflow. Needs a 10-minute read before any change |
| Projects | OOS / PH | §23 marketplace, guaranteed allocation | Hide from nav |
| Performance | P4 / PH | §15I; §23 automated scoring | Hide from nav |
| Meetings | OPT / PH | §15D | Hide from nav |
| Team | Not in PRD / PH | none | Hide from nav |

Dead code `PartnerModulePage.tsx` and `partner/config/modules.ts` ("Scaffold only") are unrouted (DOC; Stage 1 grep). Not nav; cleanup only.

### 4.2 Admin Console (`src/config/navigation.ts`, grouped)

| Group / item | Class | Basis | Recommendation |
|---|---|---|---|
| Dashboard | R-OK | §14 overview | Keep |
| Enquiry Overview, All / Project / General Enquiries | R-OK | §14 | Keep |
| Strategic Overview, Strategic / M&A | R-OK (UI hint only; enforcement NONE) | §14 restricted | Keep |
| Lead Assignment | R-OK | §14 | Keep |
| Discussions | R-INC | §14 role table mentions "partnership discussions"; no backend discussion resource; page is metrics plus proxy lists | Keep for now; decide (BD-2/BD-8) whether it duplicates Enquiries |
| Follow-ups | R-OK | §14 | Keep |
| Partner Applications, Application Reviews | R-OK | §14 | Keep |
| Document Review | R-OK | §14 | Keep |
| Approved Applicants, Onboarding | R-OK | §11, §28 | Keep |
| All Partners | R-OK | §14 partner database | Keep |
| Partner Accounts | Supporting | §14 users/access | Keep |
| Communications | R-INC | §14 communication history | Keep (A-10) |
| Notifications | Supporting | §14 notifications | Keep |
| Delivery Tracking | R-OK | §18 Notification delivery status | Keep |
| Email Templates | R-OK | §14 notification templates | Keep |
| Website: Overview, Pages, Content Approval, Public Claims | R-OK | §14, §28 content register | Keep |
| Website: Homepage & Banners, Services, Industries, Media Library | **PH** (routes show "not available") | §14 says "website pages, insights" only; §15E optional | Hide from nav (keep routes) |
| Reports (Overview, Applications & Onboarding, Business Enquiries, Strategic/M&A, Partners, Communications) | R-OK | §14 reports/CSV | Keep |
| Admin Users | R-OK | §14 roles/users | Keep |
| Roles & Permissions | R-INC / borderline PH | §14 fixes four roles; page is read-only and partial | Keep read-only; do not build role editing |
| Audit Logs | R-OK | §14, §19 | Keep |
| Privacy & Governance | R-OK | §19 | Keep |
| System Settings, Security Settings | R-OK | §14 | Keep |
| My Account (Profile, Change Password) | Supporting | §19 | Keep |
| Email composer, Notification preferences | PH, **routed but not in the nav** (`router.tsx`; no nav entry found) | none | Already hidden; nothing to do |

Net: hide **4 Partner items** and **4 Admin CMS items** (8 total). Hiding means removing nav entries only; no page or route is deleted and no workflow is lost. Tests that assert navigation (`router.test.tsx`, `PartnerProjectsPage.test.tsx`, `PartnerPerformancePage.test.tsx`, `PartnerTeamPage.test.tsx`, `PartnerPhase32.test.tsx`) must be checked first.

---

## 5. Completion reports

These are **my decomposition of §13/§14/§19/§28**, taken from Stage 1's 40 rows with the re-classifications in §3. The PRD does not number requirements, so these are indicative, not an official count. The 115-feature matrix is **not** used. Every "runtime verified" figure is **0**.

### 5.1 Partner Portal (PRD §13, §19 applicable parts)

| Measure | Count | Rows |
|---|---:|---|
| Total mandatory requirements | 18 | P-01 … P-18 (P-02 partner MFA and P-17 scanning are "consider"/"where available" and are carried as conditional) |
| Fully implemented in code | 14 | P-01, 02, 03, 04*, 05, 06, 07, 08, 09, 10, 11, 12, 13, 15 (*P-04 counted as met in its reactive form, pending BD-6) |
| Partially implemented | 0 | (P-04 moved to "implemented, decision pending") |
| Not implemented | 1 | P-16 (no size pre-check; limit unknown) |
| Backend-dependent (frontend cannot prove) | 3 | P-14, P-17, P-18 |
| Also depends on backend for enforcement | all | role isolation, token expiry, upload validation |
| Runtime verified | **0 of 18** | |
| Outstanding decisions | 5 | BD-3, BD-5, BD-6, BD-7 (and BD-4) |

Sums: 14 + 1 + 3 = 18.

Strictly, if P-04 is held to a stricter reading ("idle timeout") it returns to Partial: 13 / 1 / 1 / 3.

### 5.2 Admin Console (PRD §14, §19 staff duties, §28)

| Measure | Count | Rows |
|---|---:|---|
| Total mandatory requirements | 22 | A-01 … A-22 (A-19–A-21 mandatory only if 3.0 binds) |
| Fully implemented in code | 19 | A-01, 02, 03, 04, 05, 06, 07, 08, 09, 11, 12, 13, 14, 15, 16, 17, 18, 20, 21 |
| Partially implemented | 2 | A-10 (definition unresolved), A-22 (workflow done; deletion scope and retention schedule unconfirmed) |
| Not implemented | 1 | A-19 (conditional on 3.0 and BD-1) |
| Backend-dependent for enforcement | 5 | A-05 strategic restriction, A-12 role enforcement, A-15 CSV safety, A-16 audit completeness, A-21 "two references" rule |
| Runtime verified | **0 of 22** | |
| Outstanding decisions | 4 | BD-1, BD-2, BD-3, BD-8 (plus BD-9) |

Sums: 19 + 2 + 1 = 22. A-22 is moved from Stage 1's "Implemented" to "Partial" here because §3 above shows the deletion outcome is unconfirmed.

### 5.3 What these numbers are not

They show what exists **in code with mocked tests** (Stage 1 re-ran typecheck, lint and 378 unit tests, all passing; Playwright was not re-run). They do not show the portals work against the live backend, and they say nothing about the public website.

---

## 6. Working-tree safety (read-only inspection)

Inspected with `git status -sb`, `git log`, `git stash list` only.

- **State now:** branch `main`, in sync with `origin/main`, latest commit `b987b7a` ("Update features, add tests, docs and deploy config"), pushed earlier in this session. Zero stashes.
- **Therefore Stage 1's warnings are out of date:** the 107 modified files, 15 untracked source files, 20 untracked tests, 7 untracked docs, `render.yaml` and `scripts/` are all now **committed and pushed** in `b987b7a`. The "audited code is mostly uncommitted" risk (Stage 1 §2) no longer applies.
- **Categories (all now in `b987b7a`):** modified source under `src/`; untracked source (e.g. `StartApplication.tsx`, `PartnerEnquiriesPage.tsx`, `StaffSecurity.tsx`, `ProfileEditor.tsx`, `AllFollowUps.tsx`, `csv.ts`, `tabOwner.ts`); untracked tests (about 20); documentation (the `docs/` set); deployment-related (`render.yaml`, `scripts/probe-live.mjs`).
- **New since the commit:** only this report, untracked.
- **Not in git by design (ignored):** `.tmp/` (including `prd.txt` and the saved OpenAPI files), `.env.development.local`, `dist/`, `node_modules`, `test-results`. If these matter, they exist only on this machine.
- **Unreviewed in the pushed commit:** `render.yaml` and `docs/SECURITY_HEADERS.md` were pushed without review (Stage 1 did not read them). They contain no secrets that I know of, but I have not checked. Worth a quick read.
- **How to keep the state safe (suggestions only, nothing done):**
  1. Treat `b987b7a` as the audited baseline; note the hash in the approval record.
  2. Before any Stage 3 work, create a branch from it (for example `stage3-prd-completion`) and a lightweight tag on `b987b7a` so it can be restored.
  3. Copy `.tmp/prd.txt` (or the original PDF, found in Downloads and `Documents/cs_public_portal`) somewhere versioned so the requirement source is not lost.
  4. Commit this report alone, on the branch, only when you approve.

---

## 7. Genuine outstanding gaps (consolidated)

| ID | Gap | Type | Blocks on |
|---|---|---|---|
| P-16 | No file-size pre-check | Frontend, small | Backend limit (BD-7) |
| P-18 / A-22 | Retention schedule and physical deletion unconfirmed | Backend + policy | BD-3 |
| A-10 | "Communication history" undefined; no unified per-record log | Decision first, maybe backend | BD-8 |
| A-19 | Thresholds not displayed | Frontend, small | BD-9, BD-1 |
| P-04 | Idle timeout absent (token expiry works) | Policy | BD-6 |
| P-14 | Private storage and download audit not provable | Backend | Backend confirmation |
| P-17 | No malware scanning | Recorded decision | BD-5 |
| (new) | Zero runtime verification of anything | Verification | Permission and a named non-production target |

Not gaps (reclassified): the 10 "Backend Blocked" features (Stage 1 §4) are not §13/§14 requirements.

---

## 8. Optional and Phase 4 features

| Feature | Class | Present? |
|---|---|---|
| Meetings (confirm/decline/cancel on enquiries) | Optional §15D | Yes in admin; partner page is a placeholder |
| Content scheduling, newsletter CSV | Optional §15E | Yes |
| Trust centre, FAQ centre, CRM sync, international readiness | Optional §15A, C, F, G | Not in this repo |
| Audit trail, content approval, retention controls | §15H (also required by §14/§19) | Yes (audit, approval); retention per P-18 |
| Partner directory, capability filters, scorecards, workflow automation, collaboration workspace | **Phase 4** §15I | Not built; Performance page is a compliant "not offered" notice |
| Payments, e-signature, marketplace, auto-decision scoring, ERP/CRM replacement | **Out of scope** §23 | None found (Stage 1 grep) |

---

## 9. Backend dependencies

| Need | For | Owner action |
|---|---|---|
| Upload size limit and error shape | P-16 | Provide number |
| Statement of what "execute deletion" removes; file destruction; retention fields | P-18, A-22 | Written confirmation |
| Download audit logging, private storage | P-14 | Written confirmation |
| Scanner availability | P-17 | Yes/no |
| Token lifetimes, refresh rotation | P-04 | Provide values |
| Role and strategic-record enforcement | A-05, A-12 | Confirm and test |
| Unified communication log (only if BD-8 requires it) | A-10 | Decide after BD-8 |
| Per-stage owner and timestamp fields | A-20 | Confirm |
| Readiness check for "two client references" | A-21 | Confirm |
| Formula-safe CSV | A-15 | Confirm |

The only backend named in the repo is `https://coralswift-backend.onrender.com`; nothing says whether it is production or staging.

---

## 10. Business decisions required

BD-1 to BD-9 as in §1.3, in priority order: **BD-9 (version)**, BD-3 (retention), BD-8 (communication history), BD-1 (pathway thresholds), BD-6 (session policy), BD-7 (size limit), BD-2 (queue owners), BD-4 (document list), BD-5 (providers).

---

## 11. Recommended implementation sequence (after your approval only)

0. **Approve or amend this report**, including BD-9 and the navigation list.
1. **Baseline:** branch and tag from `b987b7a` (see §6).
2. **Runtime verification, read-only** against a non-production target you name (needs your decision D2 from Stage 1): login, role matrix, strategic restriction, document download audit entry, expiry behaviour. This converts "0 verified" into numbers and may close P-14 and P-04.
3. **Navigation:** remove the 8 placeholder entries (4 partner, 4 admin CMS); update affected tests. Low risk.
4. **Safe cleanup:** stale comments, dead scaffold, doc figures (Stage 1 C1–C4).
5. **Decision-gated work, in this order, each only after its decision:** P-16 size pre-check → A-19 criteria panel (if 3.0 and BD-1) → A-10 history view (after BD-8) → P-04 idle timer (only if BD-6 asks) → P-18 surfacing (after BD-3 and backend).
6. **Full verification:** typecheck, lint, unit tests, Playwright; authenticated cross-portal pass.

Nothing in 5 should start before its decision is recorded.

---

## 12. Testing and acceptance criteria

- Gates, all must pass after each change: `npm run typecheck`, `npm run lint`, `npm test` (baseline 62 files / 378 tests), production build, `npm run e2e`.
- Per-item criteria are in §3.
- Navigation change: no required route becomes unreachable; each hidden route still resolves by direct URL; navigation tests updated; no workflow in §4 marked R-OK loses an entry point.
- Runtime pass (read-only first): partner A cannot see partner B's data; BDM cannot open a strategic record; document download is audited; expired token ends on the expired page; each of the six stages displays on both portals.
- Any claim of "verified" must name the environment, date and the call made.

---

## 13. Final approval checklist

- [x] BD-9: PRD version confirmed in chat on 2026-11-11: **3.0 binding** (§28–§30 are mandatory). Consequence: A-19, A-20, A-21 and all §28 items are mandatory; A-19 now waits only on BD-1 (which pathway each threshold applies to)
- [ ] Confirmed that the PRD is approved (cover still says Draft)
- [ ] Reclassification of P-04, A-22 accepted
- [ ] A-19 decision: build (3.0 + BD-1) or defer
- [ ] BD-8: definition of "communication history" supplied
- [ ] BD-3: retention schedule and deletion scope supplied by business and backend owners
- [ ] BD-6, BD-7: session policy and file-size limit supplied
- [ ] P-17: "no scanning at launch" recorded as a decision
- [ ] Navigation: hide the 8 placeholder items (yes/no, per item)
- [ ] Runtime testing: permission given, non-production target named, read-only or full flows
- [ ] Branch and tag from `b987b7a` approved
- [ ] `render.yaml` and `docs/SECURITY_HEADERS.md` reviewed
- [ ] Understood that the public website (§6–§12) is outside this repo and unaccepted

**Stop point:** no implementation, cleanup, navigation change, commit, push or deployment has been done or will be done until you approve.
