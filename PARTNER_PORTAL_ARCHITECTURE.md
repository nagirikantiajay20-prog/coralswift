# Partner Portal Architecture (Phase 22 foundation)

Status: foundation + Phase 23 partner authentication. No data pages yet. Nothing here was tested against the live backend with a partner account (none available).

## 1. Application architecture
Single Vite/React 19 SPA (`coralswift-admin-console`). The repo contains the **Admin Console only**; the Public Website is a separate codebase and is not in this repository (not inspected). The Partner Portal lives in `src/partner/`, mounted at `/partner/*` in `src/app/router.tsx`, using the same Tailwind tokens, UI primitives, `ErrorBoundary`, `ModulePlaceholder` and the single Axios client (`src/services/api/client.ts`).

```
src/partner/
  config/  routes.ts  navigation.ts  modules.ts  endpoints.ts
  layouts/ PartnerLayout.tsx   (header, responsive nav, notification + account entry)
  pages/   PartnerModulePage.tsx (honest scaffold per module)
  routes.tsx
```
Later phases add `services/`, `hooks/`, `types/`, `components/` here, only when real code needs them.

## 2. Cross-portal integration
```
Public Website --POST /enquiries/partner, /partner/applications--> Backend (source of truth) <-- Admin Console (/reviewer/*, /admin/*)
                                                                          ^
                                                          Partner Portal (/partner/*, /auth/*)
```
No portal has its own database or copy of application records. Partner Portal reads/writes only `/api/v1/partner/*` and `/api/v1/auth/*`.

## 3. Reusable existing components
`components/ui/*` (button, card, dialog, dropdown), `components/common/*` (PageHeader, DataTable, StatusBadge, states, ConfirmDialog, Pagination, ErrorBoundary, ModulePlaceholder), `components/forms/*`, `services/api/client.ts` + `errors.ts`, `lib/utils`, logo asset. `ModulePlaceholder` gained an optional `note` prop (default unchanged).

## 4. Route structure
`/partner` -> `/partner/dashboard`; `application`, `company`, `documents`, `messages`, `notifications`, `enquiries`, `profile-changes`, `account`; `*` -> 404. Not in admin navigation; not under the admin `ProtectedRoute`. Partner sign-in/forgot/reset/activate routes are Phase 23.

## 5. API integration
`src/partner/config/endpoints.ts` lists the verified endpoints (see section 11). All calls must use the shared `api` client (Bearer injection, single-flight refresh, 401 handling already there). No paths, payloads or status values are invented; response shapes are referenced by OpenAPI schema name and will be typed when each module is built.

## 6. Authentication dependency (Phase 23)
Backend: `POST /auth/login` (returns tokens; `mfa_required` / `mfa_enrollment_required` flags), `/auth/refresh`, `/auth/logout`, `GET /auth/me` (`user_type: partner|staff`, `organization {id, legal_name}`), `/auth/password-reset/*`, `/auth/sessions`. **Gap in this repo:** `authStore` / `authService` / `ProtectedRoute` model staff sessions only and `authService` deliberately rejects partner accounts. The portal therefore must not reuse `ProtectedRoute`; Phase 23 needs a partner session path (user_type === 'partner', organization present) and a partner guard, reusing the same token plumbing (`configureApiAuth`). Tokens are memory-only today (reload signs out); session persistence needs a backend cookie option. Whether partners are subject to MFA is unverified.

## 7. Account-provisioning dependency
Verified sequence: application submitted -> staff review/transition -> Super Administrator `POST /reviewer/invitations` (organization_id of an existing partner; 201; 409 on conflict) -> invitee opens the emailed link and `POST /auth/invitations/accept {token, password}` -> sign in. Admin never sees tokens or passwords; no account is created on submission. **Unverified:** invitation email contents/link URL and the portal route it points to (the activation page path must match the backend's email template: confirm before Phase 23); invitation expiry/resend (no endpoint); duplicate-account prevention beyond the backend 409.

## 8. Data ownership
Backend owns everything. The partner's organization is derived from the token membership on every `/partner/*` call; the frontend never sends an organization id.

## 9. Security model
Backend enforces authorization and organization isolation; frontend guards are UX only. Memory-only tokens, no secrets in the bundle (only `VITE_API_BASE_URL`), documents are private and fetched through the authorised download endpoint (no public URLs), uploads are quarantined with **no malware scanner configured** (backend note), error messages go through the existing safe error mapper, input validated with Zod/React Hook Form. No fake auth or permission checks were added.

## 10. Remaining phases (proposed)
23 Partner auth (activate, sign-in, reset, session expiry, guard, logout) · 24 Dashboard + application status/history + messages · 25 Company profile, completion, change requests/history · 26 Documents (upload, versions, download, requests) · 27 Notifications + enquiries · 28 Live verification with real partner account, a11y/responsive QA.

## 11. Backend capabilities verified (openapi.json, 2026-11-10; contract only, no authenticated calls)
Partner: `GET/POST /partner/applications`, `GET/PATCH /partner/applications/{id}`, `.../readiness`, `.../submit`, `.../resubmit`, `.../withdraw`, `.../history`, `GET/POST .../messages`; `GET/PUT /partner/organization`, `.../completion`, `.../history`, `GET/POST .../change-requests`; `GET /partner/notifications`, `GET /partner/enquiries`; `GET/POST /partner/documents`, `GET/DELETE /partner/documents/{id}`, `POST .../versions`, `GET .../history`, `GET .../download?version`. Auth endpoints above. All partner endpoints declare Bearer security.

## 12. Not verified / missing
Live behaviour of any partner endpoint, role/permission model for partners (spec shows no partner roles; PRD "role-based access" for partners is unsupported by the contract seen), session-expiry timing, notifications content (type/status only; no in-app feed, read state or preferences), "additional document requests" as a distinct resource (only application information-requests via messages), malware scanning, retention/secure deletion (soft delete only), `GET /partner/enquiries` and notifications row shapes (untyped dicts), invitation resend/status, partner MFA. Public Website integration is not inspected (separate repo).

## PRD classification
Mandatory (PRD section 13): secure sign-in + reset, role-based access, session expiry, profile + application status, profile completion, reviewer messages, documents + additional requests, notifications, enquiry history, profile update requests + history, private document storage. Recommended: partner MFA ("consider"). Future: none stated beyond Phase 2.

## Phase 23 – Partner authentication & secure access

**Architecture.** One shared auth stack, two session kinds. `authService.login/refresh/signOut`, the Axios interceptors (Bearer, single-flight refresh, 401 -> expire) and `authStore` are reused. `authStore` gained `partner` (mutually exclusive with staff `user`; `setPartner` clears `user` and vice versa). `partnerAuthService.loadSession` calls `GET /auth/me` and accepts only `user_type=partner` with an `organization`; anything else is signed out and rejected. The admin `authService.loadSession` still rejects partners, so each portal refuses the other's accounts.

**Endpoints integrated (all pre-existing, verified in openapi.json):** `POST /auth/login`, `GET /auth/me`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm`, `POST /auth/invitations/accept`; MFA verify/enroll/confirm are reused if the backend demands them for a partner. No new endpoints or fields were invented.

**Routes.** Public: `/partner/login`, `/partner/forgot-password`, `/partner/reset-password`, `/partner/activate` (`?token=`). Guarded by `PartnerRoute`: everything else under `/partner`. No session -> `/partner/login` (destination kept; only in-app `/partner/*` non-auth paths honoured, so no open redirect or loop). Staff session -> "Access denied" (not promoted, not signed out). Partner session on `/admin/*` -> admin guard redirects to admin login. Logout (header) revokes the server session, clears state, goes to partner login.

**Session/token handling.** Tokens are memory-only (backend returns them in the body; no cookie option exists). Consequences: a browser refresh signs the user out, and tabs do not share sessions (no cross-tab sync is possible or added). Expiry: a 401 triggers one refresh; if it fails the store is expired and the guard returns to login with a "session expired" notice. Token lifetimes are backend-defined and not assumed. Passwords are never stored or logged.

**Account eligibility.** Decided only by the backend: login returns one generic 401 for unknown, wrong-password, locked, inactive and not-yet-activated accounts, so the UI cannot (and does not) distinguish "not activated" / "suspended" and shows the backend message plus static guidance (accounts are invitation-only). Submission/approval create no account (unchanged; only the Super Administrator invitation does).

**Password reset.** Supported by the backend and wired (generic "if an account exists" confirmation; reset with `token` + `new_password`). Pages are the existing admin ones with a `loginRoute` prop. The 8-character minimum is a client placeholder; the backend documents no policy. **Dependency:** which URL the backend emails (`/reset-password` vs `/partner/reset-password`, `/partner/activate`) is not in the spec; both reset paths work with the same endpoint, but the invitation email must link to `/partner/activate?token=...`. Confirm with backend.

**Data isolation.** The frontend never sends an organization or partner id; `/partner/*` resolves the organization from the token membership. The organization name shown in the header comes from `/auth/me`. Isolation is backend-enforced and unverified here.

**Gaps / limitations.** Not tested live (no partner credentials). Unauthenticated-vs-unactivated distinction unavailable; no partner roles/permissions in the contract; partner MFA policy unknown; no session persistence; no change-password endpoint. Existing admin LoginPage wraps its password input in a div inside `FormField`, so its label is not bound to the input (pre-existing a11y defect, left untouched; the partner login binds it correctly).

## Phase 24 – Partner invitation & activation

**Backend re-verified (openapi.json fetched 2026-11-10, identical to the Phase 21 snapshot).** The only invitation-related endpoints are `POST /reviewer/invitations` (Super Administrator; `{email, full_name, organization_id | new_organization_legal_name, source_enquiry_reference}` -> 201 `{organization_id}`; 401/403/404/409/422) and `POST /auth/invitations/accept` (`{token 10..200, password 1..256}` -> 200 empty; 400/422). **Credential mechanism:** emailed invitation link carrying a token; the partner chooses their own password at activation. No generated/temporary passwords, OTPs or admin-set credentials exist. Delivery is backend-owned (no email service in the frontend).

**Lifecycle:** application submitted -> staff review/transition -> onboarding (Admin Console `ProvisioningPanel`, gated by `provisioningBlockers` and Super Administrator role, confirm dialog) -> `POST /reviewer/invitations` -> email -> `/partner/activate?token=...` -> `POST /auth/invitations/accept` -> `/partner/login`. Approval never creates or activates an account.

**Implemented in Phase 24 (partner side):** activation page now shows/hides passwords (shared toggle), validates password + confirmation (mismatch caught client-side, no request), removes the token from the address bar/history after reading it (kept in memory only, never logged), disables submit without a token, and on a backend 400 explains the link may be invalid, expired or already used and what to do. Success replaces the form (no duplicate submit) and links to partner sign-in; no tokens are set by activation, so no auth state changes and no roles are granted. Admin provisioning was already in place and is unchanged.

**Statuses supported:** none readable. The backend exposes no invitation/account status, delivery status, expiry, revocation, resend or provisioning-history endpoint, so the console shows only "backend accepted the request" for the current session and states the limit (no status UI is simulated). Invalid / expired / already-used / revoked are indistinguishable (single generic 400).

**Authorization:** provisioning is Super Administrator only (UI hint + backend 403); partners cannot provision; the backend validates the token, partner association, expiry and single-use; duplicates are rejected by the backend (409); the console disables re-sending after success within the session.

**Backend dependencies (blocking for the remaining requested features):** (1) invitation/account status + delivery result on the organization or a list endpoint; (2) resend/revoke endpoint with rate limiting; (3) distinct error codes for expired / used / revoked tokens; (4) documented password policy; (5) confirmation that the email link targets `/partner/activate?token=`; (6) provisioning history (audit `GET /admin/audit` may contain invitation events; action names unverified).

## Phase 25 – Partner Dashboard

**Route:** `/partner/dashboard` (`PartnerDashboardPage`), inside `PartnerRoute` (UX guard) and `PartnerLayout` (header: organization name, notifications link, account link, logout - from Phase 22/23). Code: `services/partnerDashboardService.ts`, `hooks/usePartnerDashboard.ts`, `pages/PartnerDashboardPage.tsx`.

**Endpoints (all GET, Bearer, via the shared `api` client; no ids sent):** `/partner/applications`, `/partner/organization/completion`, `/partner/documents`, `/partner/notifications?page=1&page_size=5`, `/partner/enquiries`, and for the latest application only `/partner/applications/{id}/history` and `/partner/applications/{id}/messages`. The `{id}` comes from the partner's own list response; the backend still enforces ownership. One independent query per endpoint (parallel, 60 s stale time, 1 retry); history/messages are dependent on the applications result.

**Metrics and sources:** Profile completion % = `CompletionOut.percent` (backend value, no client calculation; missing sections = `missing_fields`, shown humanised, not interpreted). Application status = `ApplicationOut.status_label` of the most recently submitted application (drafts fall back to list order). Open information requests = sum of `open_information_requests`. Documents on file = length of `/partner/documents`. Activity = `PartnerHistoryItem` (`to_label`, `note`, `created_at`) + reviewer messages (`from_reviewer`), newest 6. Notifications = rows of `/partner/notifications`. Enquiries = rows of `/partner/enquiries` (first 5 shown).

**Isolation:** the browser never sends a partner/organization id (a test asserts this); query keys include the signed-in partner id so cache is never shared across partner sessions; only `/partner/*` endpoints are used, no admin endpoints; document `review_comment` and message bodies from partner-safe schemas only (`review_comment` is not rendered). Frontend is a UX layer; backend authorization is authoritative and not verified live.

**States:** per-section skeleton, empty state, error with Retry (refetches only that section), 401/403 messages; one failing endpoint does not affect others. Activity shows an error only if both history and messages fail.

**Not built (backend limits):** *Unread notifications* - the backend has no in-app feed or read state (email type/status only), so no unread count, no mark-as-read. *Open enquiries* - enquiry status values are undocumented, so the dashboard lists enquiries rather than counting "open". *Pending/requested document requests, deadlines, rejected documents* - no document-request resource exists; documents show raw `status` and `current_version.review_status` strings, unmapped. *Account status/identifier* - not exposed by `/auth/me`. *Settings* - account page is still a scaffold. Notification/enquiry rows are untyped dicts: the page reads `type|template|subject`, `status`, `created_at|sent_at` (notifications) and `reference_number|reference|id`, `enquiry_type|type`, `status`, `created_at` (enquiries) if present - **unverified field names, confirm with real data**. Links go to Phase 22 scaffold modules (company, application, documents, messages, notifications, enquiries) until those phases are built.

## Phase 26 – Company profile management

**Routes:** `/partner/company` (`PartnerCompanyPage`), `/partner/profile-changes` (`PartnerProfileChangesPage`). Code: `services/partnerProfileService.ts`, `hooks/usePartnerProfile.ts`, `components/ProfileSection.tsx`, `utils/profileFields.ts` (sections, labels, validation).

**Endpoints (Bearer, shared `api` client, no organization/partner id ever sent; the backend derives the organization from the token):**
| Operation | Endpoint | Schema |
|---|---|---|
| Read profile | `GET /partner/organization` | `OrganizationOut` |
| Save now | `PUT /partner/organization` | `ProfileUpdate` (partial + `expected_version`); 409 on stale version, 403/422 surfaced |
| Completion | `GET /partner/organization/completion` | `CompletionOut` (same query key as the dashboard) |
| Request staff-approved change | `POST /partner/organization/change-requests` | `ChangeRequestIn {changes, reason}` |
| List requests | `GET /partner/organization/change-requests` | `ChangeRequestOut[]` |
| Change history | `GET /partner/organization/history` | `RevisionOut[]` |

**Sections / fields (only those in `OrganizationOut`):** Company (legal_name, registration_number, year_established, registered_address, country, website); Business (business_description, service_categories, client_references); Workforce and infrastructure (employee_count, technical_capabilities, infrastructure_summary); Financial (annual_turnover_inr_crore); Authorized contacts (authorized_contacts: name, designation, email, phone).
**Read-only:** `id`, `status` (shown as a badge), `profile_version` (used only as `expected_version`). Internal notes, reviewer assignment, classifications are not in the partner schema and are never shown.

**Update workflow (backend offers two paths; it does not document which fields require approval):** (1) *Save changes* -> `PUT`, applied immediately, recorded as a revision, sends only changed fields plus `expected_version`; a 409 reloads the profile and tells the partner. (2) *Submit for staff approval* -> `POST` change request with a required reason; profile is unchanged until staff decide in the Admin Console (Governance). The partner sees status, dates and `decision_note` on Profile changes; a pending count banner is shown on the profile. Statuses are displayed as returned (`pending` is known; `approved`/`rejected` get success/danger tone, anything else neutral). If the backend rejects a field on the immediate path, its message is shown.

**Validation:** limits copied from `ProfileUpdate` (lengths, year >= 1800, employee 0..10,000,000, turnover >= 0, country 2 chars, <= 12 categories, <= 10 references/contacts, contact email). The backend rejects empty strings, so an existing value cannot be cleared (shown as "Cannot be cleared"). Backend validation remains authoritative.

**Completion:** `CompletionOut` (percent, missing_fields) is shown on both dashboard and profile; no client calculation. Missing fields that match a known field link to editing that section.

**History:** revisions list version, date and changed field names only. Previous/new values are not shown: `RevisionOut.changes` is an untyped object and `changed_by` is an internal user id (not rendered). Change requests show the proposed values (the partner's own input).

**Unsaved data:** Cancel confirms when dirty; `beforeunload` warns; buttons disabled while a request is in flight.

**Missing backend capabilities:** trading name, company type, state/region/city, primary industry, core competencies, operating model, geographic coverage, years of experience (derivable from year_established but not a field), office locations, workforce capabilities, financial reporting period, additional contact fields, per-field editable/approval-required metadata, previous/new values in revisions, document references on the profile, field-clearing (null) semantics. Document upload/management is a later phase.

## Phase 27 – Partner document management

**Route:** `/partner/documents` (`PartnerDocumentsPage`). Code: `services/partnerDocumentService.ts`, `hooks/usePartnerDocuments.ts`, `utils/documentFiles.ts`, `components/DocumentUploadDialog.tsx`, `components/DocumentHistoryDialog.tsx`. The dashboard's Documents card now uses the same service types, status labels and `documentRequests` logic.

**Endpoints (Bearer via the shared `api` client; no organization/partner id ever sent):** `GET /partner/documents` (`DocumentOut[]`), `POST /partner/documents` (multipart `file`, `category`, optional `expires_on`), `POST /partner/documents/{id}/versions` (multipart `file`, optional `expires_on`; old versions kept), `DELETE /partner/documents/{id}` (soft delete), `GET /partner/documents/{id}/history` (`VersionOut[]`), `GET /partner/documents/{id}/download?version=` (blob, authorised + audited), `GET/POST /partner/applications/{id}/messages` (additional requests and responses). The admin Console review workflow is the existing one (`/reviewer/applications/{id}/documents/{doc}/review`, `.../download`, `.../information-requests`); nothing was added or changed there, so partner uploads, version history, review status and requests appear in it unchanged.

**Categories (backend `PartnerDocCategory`, identifiers unchanged):** registration_proof, operating_history, employee_strength, financial_statements, service_portfolio, infrastructure_summary, client_references, authorized_contact. Grouped for display only: Company standing (registration, operating history, financial), Capability (service portfolio, infrastructure, workforce), References and contacts. The backend does not say which categories require a file versus profile fields; the UI lists all eight and notes that some are also captured in the company profile. Unknown categories returned by the backend appear under "Other documents".

**File restrictions:** backend contract says "pdf, png, jpg, docx or xlsx". **No size limit is documented**, so the UI enforces none beyond rejecting empty files; the server's 413/415/409/429/422 responses are mapped to messages. Frontend checks (extension + MIME agreement) are UX only.

**Storage / scanning:** private, quarantined storage owned by the backend; no public URLs exist. The backend states **no malware scanner is configured**, and the UI makes no malware-protection claim ("checked by the server" refers to type/size/content validation only). `upload_status` is shown as returned ("File check").

**Review status mapping** (backend `ReviewStatus`): pending -> "Pending review"; accepted -> "Accepted"; rejected -> "Rejected"; clarification_needed -> "Replacement requested". No document is "under review" or "not submitted" in the backend; "Not submitted" is a category with no document. Unknown values are shown humanised. Partners cannot change review status. `review_comment` is the reviewer text the backend marks "Visible to the partner" and is the only reviewer text shown.

**Additional document requests:** the backend has no separate resource. A request = a reviewer message with `requested_categories`; it is "answered" once the partner has a message whose `in_reply_to` is its id. The card shows date, message, requested categories (each with an Upload/Replace action) and "Send response to reviewer" (`POST messages {in_reply_to, body}`). Uploads are linked by **category**, not by request id (no such link exists in the API). No deadline or request status is shown: neither is in the contract (the raw `status` value is not interpreted).

**Replace / delete:** Replace uploads a new version (history kept, viewable and downloadable per version). Remove is a confirmed soft delete. Accepted documents hide Replace/Remove (conservative UX lock; the backend contract documents no lock rule and remains authoritative).

**Preview / download:** blob via the authorised endpoint; preview only for PDF/PNG/JPEG (re-typed blob, `noopener`), otherwise download; object URLs tracked and revoked (1 s after download, 60 s after preview, all on unmount); 401/403/404/409 mapped to clear messages.

**Security:** ownership and isolation are backend-enforced (token-derived organization); query keys include the partner id; no document content or filenames are logged; reviewer identity is not exposed by the partner schemas; internal notes are not in partner schemas.

**Gaps:** no documented size limit; no malware scanning; no request-to-upload link, deadline or request status; no explicit lock/permission flags per document; categories with a single document each is assumed by the UI (multiple documents per category are listed if returned); upload cancellation aborts the client request only; not tested live with a partner account.

## Phase 28 – Application status & review tracking

**Route:** `/partner/application` (`PartnerApplicationPage`). Code: `utils/applicationStatus.ts` (all mapping/derivation, pure), `hooks/useApplicationTracking.ts`, `pages/PartnerApplicationPage.tsx`. The dashboard's Application card reuses `statusInfo`/`infoRequests` and the same query keys (`applications`, `history`, `messages`), so no extra API calls.

**Endpoints (existing partner client; token-derived organization; no ids of the partner/org sent; `{id}` comes from the partner's own list):** `GET /partner/applications` (`ApplicationOut`: reference, status, status_label, pathway, cover_note, submitted_at, open_information_requests), `GET .../{id}/history` (`PartnerHistoryItem`), `GET .../{id}/messages` (`PartnerMessageOut`), `POST .../{id}/messages` (`RespondIn {in_reply_to, body}`). Ownership is enforced by the backend (404/403 surfaced as errors). Withdraw/resubmit endpoints exist but are not part of this phase's UI.

**Status mapping (backend `PortalStatus`, unchanged):** draft, submitted, eligibility_verification, capability_review, commercial_legal_review, information_requested, pilot_onboarding, scale_up, rejected, withdrawn. There is **no `approved` status**; nothing in the UI says "approved". Each status has a tone, plain-language meaning and next step in `STATUS_INFO`; unknown values fall back to the backend `status_label`.

**Progress tracker rules:** reference stages = submitted, eligibility, capability, commercial/legal, pilot onboarding, scale-up (those the backend models). A stage is *Completed* only if history (or `submitted_at` for "Submitted") confirms it; skipped-but-not-recorded earlier stages show *Not recorded*; later stages show *Upcoming*. `information_requested` keeps the last reached pipeline stage as current (marked paused). rejected/withdrawn show reached stages only, no upcoming. Draft has no tracker. No percentages. Eligibility verification is never shown as approval.

**History:** `to_label`, time and the partner-visible `note` only; "Next" text is our static per-status guidance, not backend text. No internal events (not in the partner schema).

**Messages / information requests:** reviewer messages whose `kind` contains "request" or that name `requested_categories` are requests (the `kind` vocabulary is not enumerated in the contract, so matching is loose); other reviewer messages are listed as messages. Answered = partner reply with `in_reply_to` = request id (same rule as Documents). Each shows date, body, requested categories (link to Documents) and a response form (`POST messages {in_reply_to, body}`, max 4000) with confirmation toast and refetch. Profile updates link to Company profile. No due date (not in contract).

**Decision display:** only when status is `rejected`, `pilot_onboarding` or `scale_up`. Date and reason are the matching partner-visible history entry's `created_at`/`note`; if absent, "No explanation has been provided". No approve/reject controls exist.

**Onboarding lifecycle:** submitted (submitted_at), under review (a review stage reached in history/status), decision communicated, pilot onboarding, account activated (shown confirmed because the partner is signed in; provisioning/activation dates are not exposed), operational status (always "not reported"). A decision never implies activation.

**Security:** `/partner/*` only; no admin endpoints; query keys include partner id; unauthenticated users are redirected with no calls; internal assignee/notes/eligibility scoring are not in partner schemas and never rendered.

**Missing backend capabilities:** partner-visible eligibility outcome endpoint (none; admin `EligibilityOut` is reviewer-only, so Eligibility is not displayed); decision date/reason as a dedicated field (derived from history note); request due date, request status enum, request-to-document link; `kind` enumeration for messages; account provisioning/activation timestamps and operational status; typed explanations per history event; `last_updated` on `ApplicationOut` (derived from latest history). Not tested against a live partner account.

## Phase 29 – Partner onboarding management

**Backend finding (openapi.json, 2026-11-10): there is no partner-facing onboarding API.** No onboarding record, reference, checklist, task, required-field, completion, partner-action or onboarding-message endpoint exists (`/partner/*` = applications, organization, notifications, enquiries, documents only). The only onboarding signals are application statuses `pilot_onboarding` and `scale_up` and the partner-visible status history. The workspace is therefore a **read-only view derived from existing partner endpoints**; nothing is stored, completed or transitioned in the browser, and no endpoint was added or invented.

**Route / code:** `/partner/onboarding` (nav item "Onboarding"). `utils/onboarding.ts` (pure derivation), `hooks/useOnboarding.ts`, `pages/PartnerOnboardingPage.tsx`, shared `components/Panel.tsx` (Panel/Async/format helpers, now also used by the Application page). Dashboard gained an "Onboarding" card built from the already-loaded dashboard queries (no extra requests).

**Endpoints (all GET, existing, token-derived organization, no ids of partner/organization sent):** `/partner/applications`, `/partner/applications/{id}/history`, `/partner/applications/{id}/messages`, `/partner/organization/completion`, `/partner/documents`. Query keys are the shared `['partner', pid, ...]` keys, so data is cached once across Dashboard, Application, Documents and Onboarding.

**Confirmed onboarding stages:** `pilot_onboarding`, `scale_up` only. Phases: *Not started* (application still in review; review is a separate process), *Onboarding initiated* (`pilot_onboarding` reached), *Scale-up*, *closed* (rejected/withdrawn: no progress shown). `information_requested` keeps the phase already reached in history. Initiation date = first history entry reaching `pilot_onboarding`; last updated = newest partner-visible history entry. No percentages. A decision/stage is never shown as onboarding completion or account activation: the lifecycle list adds "Onboarding completed" that is never confirmed (no completion record exists).

**Checklist:** not provided by the backend, so none is shown (an explanatory panel states this). No frontend completion records.

**Partner actions (derived, link-only):** unanswered reviewer information/document requests -> Application (response form lives there); documents with review status rejected/clarification_needed -> Documents; backend `missing_fields` of profile completion -> Company profile. No duplicate forms, uploads or messaging.

**Documents / communication:** document list with the Phase 27 review-status labels/tones and a link to Documents. Messages = partner-visible reviewer messages created on/after initiation (no per-activity link exists in the contract); requests show "Awaiting your response"/"Response sent" using the Phase 27/28 `in_reply_to` rule. Internal notes are not in partner schemas and are not rendered.

**Admin Console dependencies (unchanged):** staff move stages (`pilot_onboarding`/`scale_up`), review documents, send requests and provision accounts (Super Administrator `POST /reviewer/invitations`) in the existing Phase 7/Provisioning workflow. The Partner Portal cannot approve, change status, provision or activate; the page is read-only (a test asserts no POST).

**Security:** `/partner/*` only, no admin endpoints; backend enforces ownership; query keys include the partner id; frontend guards are UX only.

**Missing backend capabilities:** onboarding record + reference, onboarding-specific statuses/stages and completion timestamp, checklist/task API with required fields and due dates, onboarding history distinct from application history, onboarding-linked messages, partner-visible provisioning/activation dates and operational status, per-document requirement flags for onboarding. Not tested against a live partner account.

## Phase 30 – Project & engagement visibility (backend-blocked)
**Finding (live `openapi.json` fetched 2026-11-10, 115 paths):** the backend has **no partner-facing project, engagement, milestone, assignment, contract or project-communication endpoints**. The only project/engagement-related paths are `POST /enquiries/project` (public), `GET /catalog/project-categories` (public, illustrative), `POST /admin/enquiries/{id}/assign` and `POST /reviewer/applications/{id}/assign` (staff-only, lead/application assignment — not project assignment; must not be reused). Per the phase rules nothing was invented or simulated.

**Built:** `/partner/projects` (`PartnerProjectsPage`, nav "Projects"). It states plainly that project visibility is not available and that an application/pathway is not an assignment or allocation, and shows the one real engagement signal: `pathway` from `GET /partner/applications` (enum `EngagementPathway`: `direct_project_engagement`, `vendor_subcontracting`, `strategic_merger_integration`; labels in `partner/utils/engagement.ts`). The strategic pathway shows its name only. Same query key as the dashboard (cache shared, keyed by partner id). No partner/org id is ever sent.

**Not built (no backend support):** project list/detail, statuses and mappings, milestones, assignment acknowledge/confirm/respond, project documents (Phase 27 documents are company documents, no project link), project communications, dashboard project metrics.

**Missing backend capabilities** (needed before the UI can be built): partner-scoped `GET /partner/projects` and `/{id}` (org derived from token, only admin-shared records, no internal notes); explicit engagement type + status enum; milestones; assignment-response actions; project↔document and project↔message links; M&A/strategic data excluded from partner serialisers.

## Phase 31 – Communications & notifications
Messages: `PartnerMessagesPage` over `useApplicationTracking` (shared query keys, no extra calls).
Notifications: `PartnerNotificationsPage` over `partnerDashboardService.notificationsPage`.
Contract limits (no read state, preferences, attachments, in-app feed) are listed in
PROJECT_PROGRESS.md Phase 31; the header bell links to the page with no unread badge by design.

## Phase 32 – Discussions, Meetings & Follow-ups
**Finding (openapi 2026-11-10):** no partner discussion/meeting/follow-up resources. Staff follow-ups and meeting confirm/decline/cancel are admin-only; `POST /meetings` is a public enquiry request. **Routes:** `/partner/discussions` → `/partner/messages` (redirect); `/partner/follow-ups` (`PartnerFollowUpsPage`, information requests from `GET /partner/applications/{id}/messages`, reply `POST` same path); `/partner/meetings` (`PartnerMeetingsPage`, unavailable state). **Visibility/security:** org derived from the token; query keys include partner id; `PartnerMessageOut` carries no internal notes or reviewer identity; text rendered as React text; guarded by `PartnerRoute` (UX only, backend enforces). **Admin Console:** unchanged; admin follow-ups remain staff-only and are not exposed. **Unsupported:** discussion list/attachments/participants, meeting records/actions/notes, follow-up due date/status/category/completion, event notifications. **Tests:** `PartnerPhase32.test.tsx`.

## Phase 33 – Team & user management (backend-blocked)
**Finding:** no partner team/role/invitation-management endpoints (see PROJECT_PROGRESS.md Phase 33). **Route:** `/partner/team` (`PartnerTeamPage`) shows the signed-in account and an unavailable state; no invite/detail routes. **Missing backend:** partner-scoped `GET /partner/team` and `/{id}`; partner role enum + permission model (org owner/admin/member) enforced server-side; owner-or-admin invite (with duplicate check, expiry), resend, cancel, status; activate/deactivate/remove with owner and last-admin protection and no self-escalation; `last_login_at`; per-role module permissions for other partner endpoints; audit of team changes.

## Phase 34 – Performance overview & scorecards (backend-blocked)
**Finding (live `openapi.json` fetched 2026-11-10, 115 paths):** no partner-facing performance, KPI, scorecard, rating, evaluation, feedback, milestone, project/engagement, trend or export endpoints. The only reports are staff-only (`/admin/reports/kpis`, `applications.csv`, `enquiries.csv`, `newsletter.csv`) and must not be reused. Nothing was simulated.

| Feature | Backend support | Status |
|---|---|---|
| Project / engagement history | None; only own applications (`GET /partner/applications`) | Applications listed, labelled as not projects |
| Project status, milestones | None | Not available |
| Partner feedback | Only reviewer messages on an application (Messages page) | Not available as feedback |
| Indicators, scorecards, trends, comparisons | None | Not available |
| Reports / exports | Staff-only CSVs | Not available (no export actions) |

**Built:** `/partner/performance` (`PartnerPerformancePage`, nav "Performance"): unavailable state, application history (reference, pathway, status, submitted date; shared query key with dashboard), feasibility table. No partner/org id sent; org derived from token. No metrics, charts or scores.
**Missing backend:** partner-scoped performance endpoints (org from token) with metric definitions (source, formula, period, population, partner-visible flag); scorecard records (period, category, rating, partner-shared feedback, date, recommendations; internal notes excluded); explicit publish-to-partner control; engagement/milestone records for history and trends; partner-scoped report/export endpoints.
**Tests:** `PartnerPerformancePage.test.tsx`.

## Phase 35 – Settings & security
**Finding (live `openapi.json` 2026-11-10):** shared `/auth` has `GET /auth/sessions`, `DELETE /auth/sessions/{id}`, `POST /auth/mfa/{enroll,confirm,verify,recovery-codes}`, password reset by email; `POST /privacy/requests` is public (access/correction/deletion). **No** change-password, personal-profile edit, account status, notification-preference, MFA-status/disable, sign-out-all, or privacy-request list/status endpoints.
**Routes:** `/partner/settings` (Account), `/settings/security` (password, MFA, sessions), `/settings/privacy`; `/settings/profile` redirects to Account; `/partner/account` redirects to security. Nav item "Settings".
**Code:** `pages/PartnerSettingsPage.tsx` (shell + account section), `PartnerSecurityPage.tsx`, `PartnerPrivacyPage.tsx`, `services/partnerSettingsService.ts` (shared `api` client). MFA enrollment reuses `MfaEnroll` from the login feature.
**Behaviour:** account info is read-only (from `/auth/me`); password = emailed reset link behind a confirmation (no frontend password form, no password handled); MFA = enroll/confirm and recovery-code replacement (requires a current code; codes shown once, held in component state only), status not shown because the backend does not report it, no disable; sessions list with revoke of non-current sessions behind a confirmation (ids only, no tokens); privacy request posts the signed-in email (read-only field), deletion requires a confirmation and is only a request. Notification preferences: explanatory panel, no toggles.
**Missing backend:** change-password; personal profile edit + phone/role/status fields; MFA status and disable; session expiry and sign-out-all; notification preferences; partner-scoped privacy request list/status (current endpoint is unauthenticated and trusts the email in the body). **Tests:** `PartnerSettings.test.tsx`.


> **Phase 37:** live backend is now 134 paths; staff `POST /auth/change-password` is wired (`config/endpoints.ts`, `authService.changePassword`). See `BACKEND_DEPENDENCY_REGISTER.md` Part C for other newly available endpoints not yet consumed.
