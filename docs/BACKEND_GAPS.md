# Coral Swift – Backend Gaps (all sessions, Phase 1 → Phase 35)

Compiled 2026-11-10 from `PROJECT_PROGRESS.md`, `PARTNER_PORTAL_ARCHITECTURE.md`, `ADMIN_CONSOLE_GAP_REPORT.md` and `PRODUCTION_READINESS_REPORT.md`. Backend OpenAPI was last fetched 2026-11-10 (unchanged since Phase 17).

Rule followed throughout the frontend: anything the backend lacks is shown as "not available" and **never simulated**. Each item below is what the backend must provide so the UI can be completed.

Legend: **[B]** blocks a UI feature · **[V]** needs verification/confirmation only · **[O]** ops/deployment · **[D]** needs a business decision.

> **Phase 37 note:** the live backend now exposes 134 paths. Items X5, X8, X11 and parts of §6, §8–§10, §12, §28 are closed backend-side; see `BACKEND_DEPENDENCY_REGISTER.md` (authoritative).

---

## 0. Cross-cutting (affects many modules)

| # | Need | Why / impact |
|---|---|---|
| X1 | **List pagination `meta`**: guarantee `meta.total` (and page count) on every list; document its shape [V] | Dashboards/reports/metrics rely on `page_size=1` + `meta.total`; unverified, falls back to "—" |
| X2 | **Server-side search, sort, date filters** on `/reviewer/applications`, `/admin/organizations`, `/admin/users`, `/admin/notifications`, `/admin/content`, `/admin/audit` [B] | UI currently refines only the loaded page |
| X3 | **Typed response schemas** for `/admin/overview`, `/admin/reports/kpis`, `/admin/settings`, `/admin/organizations/{id}`, notification/outbox rows, partner notification/enquiry rows, enquiry `contact/company/details/documents` [B] | Untyped dicts; field names are guessed |
| X4 | **`last_updated` / `updated_at` + actor *names*** (not only ids) on applications, enquiries, history, notes, audit [B] | Ids shown instead of names |
| X5 | **Status transition tables / allowed-next-states** for applications and enquiries [B] | UI offers a frontend-chosen set and relies on backend errors |
| X6 | **Strategic classification flag** on audit/outbox/notification rows [B] | Strategic content is currently hidden by regex heuristic |
| X7 | **Verify strategic/M&A authorization** across list, detail, search, CSV, documents, outbox, audit, overview/KPIs, notifications [V] | Frontend hiding is cosmetic; backend is the only real control. Aggregate counts can't be filtered client-side |
| X8 | **Role→module permission matrix API** (staff and partner) [B] | Role access is a frontend navigation hint only |
| X9 | **CORS allow-list** for deployed frontend origin (localhost / coralswift.com were rejected on preflight) [O] | Browser calls fail without it |
| X10 | **Cookie-based (HttpOnly) session option / refresh** [B] | Tokens are memory-only; reload signs the user out |
| X11 | **Authenticated change-password endpoint** (staff and partner) [B] | Only reset-by-email exists |
| X12 | **Malware scanner** for uploads (staff + partner) [B/D] | Backend states none is configured |
| X13 | **Document retention dates + secure file deletion** [B/D] | Partner delete is soft delete only |
| X14 | Live authenticated test accounts (all 4 staff roles with MFA + a partner account) [O] | Nothing has been verified end-to-end live |

---

## 1. Phase 1–3 – Foundation, layout, admin authentication

- Original brief had **no Coral Swift API documentation**; the Downloads `openapi.json` was for a different product. Now resolved via the live `/openapi.json`.
- CORS rejects localhost and coralswift.com origins (see X9).
- `/auth/me` is not restricted to staff; console rejects partner accounts client-side.
- No change-password endpoint (X11); sessions memory-only (X10).
- Login returns one generic 401 for unknown/wrong password/locked/inactive/not-activated accounts – UI cannot distinguish "not activated" from "suspended".
- Successful login, MFA, `/me`, refresh, logout never tested live (X14).

## 2. Phase 4 – Admin Dashboard

- Application counts for **Pending / Approved** (PortalStatus has no such values).
- **Recent decisions** (no decision timestamp on list).
- **Recent onboarding activity feed**.
- **Documents awaiting verification** – no cross-application endpoint.
- Exact keys of `/admin/overview` and `/admin/reports/kpis` undocumented (X3).
- `/reviewer/applications` has no date filter; totals computed from one page of ≤100 rows (X1).

## 3. Phase 5 – Partner Applications Management

- List: search `q`, date range, sort, category filters (X2).
- Applicant **name / email / phone** and **last updated** on list rows (contact data only inside untyped `authorized_contacts`).
- Reviewer-name lookup for non-super-admin roles (`/admin/users` is super-admin only).
- Transition table / allowed next stages (X5).
- Pagination `meta` shape (X1).

## 4. Phase 6 – Application Review & Decision

- Checklist/scoring endpoints and persistence.
- Dedicated **start-review / recommend / decision** endpoint(s) with a transition table.
- **Reversal / reconsideration** process (UI treats `rejected`/`withdrawn` as final).
- **No `approved` status** exists (decision = move to `pilot_onboarding`/`scale_up` or `rejected`).
- Actor names on history/notes (X4); application "last updated".
- Exception workflow for eligibility criteria (PRD C3); criteria threshold rules per pathway [D].

## 5. Phase 7 – Partner Onboarding & Provisioning

- Onboarding **records**, initiation, progress, required-information and completion endpoints.
- Read endpoint for **invitation/account state** (pending provisioning can't be counted; duplicate prevention relies on 409).
- List response lacks applicant name/email/phone/category/approval date/last updated; list filters (search, dates).
- Backend does not state which document categories are mandatory.

## 6. Phase 8 – Business & Project Enquiries

- List fields: phone, project category/type, last-updated, **assignee name**.
- Filter by project category / IT vs Non-IT (no such field); sort param; pagination meta.
- Typed `contact/company/details/documents` objects (X3).
- **Enquiry activity / audit and assignment-history** endpoints.
- Separate internal-note vs follow-up vs communication types.
- Status workflow/transition table; "Open", "Awaiting response", "Completed" statuses don't exist.
- Assignee lookup for non-super-administrators.

## 7. Phase 9 – Strategic / M&A Enquiries

- No strategic-specific admin API; **documented staff read/list access** for `type=strategic`.
- Strategic category (`discussion_type`) on rows + filter.
- Dedicated internal-note vs discussion vs follow-up types with visibility restriction.
- Assessment-outcome/decision endpoint; "active discussion"/"awaiting decision" statuses.
- Activity/audit history; assignee names, last-updated; sort + total; typed objects.
- Dedicated strategic queue/owner (PRD F7).

## 8. Phase 10 – Lead Assignment

- **Assignment-history** endpoint.
- Workload/aggregate endpoint and capacity rules (workload is a 100-row sample).
- `/reviewer/applications`: owner, search, priority, date filters; applications have no priority/contact/follow-up fields.
- Application assignment can't be cleared (`reviewer_id` required).
- Staff list super-admin only → other roles can't pick assignees.
- No "last updated"; no "any assigned" enquiry filter; `partner`/`meeting` assignment workflow undefined [D].
- Mapping of backend application statuses to the six allocation stages [D].

## 9. Phase 11 – Discussions & Follow-ups

- Global follow-up / discussion list endpoint.
- Follow-up **update / reschedule / reassign / cancel**; follow-up status field and own assignee.
- Follow-up date filter + counts (upcoming, completed).
- Enquiry **reply / external message** endpoint; reviewer-side message POST beyond information requests.
- Follow-up notifications (`/admin/notifications` is an email outbox only).
- Calendar view blocked (only one `next_follow_up_at` per enquiry); calendar integration [D].

## 10. Phase 12 – Document Management

- **Admin document list/search/filter** endpoint (blocks global metrics, reviewer/org/date filters).
- Per-document review **history** for staff (currently partner-only).
- Admin upload/replace/delete (partner-only today); document-level notes (application-level only).
- Enquiry-attachment list endpoint; onboarding document endpoints.
- Separate "replacement requested" status (uses `clarification_needed`).
- Malware scanning, retention, secure deletion (X12, X13).

## 11. Phase 13 – Partner Management

- Staff **edit** of partner profile (only partner-side `PUT`; `admin/profile-change-requests` exists).
- `OrgRow` lacks category/type and contact person/email/phone.
- Server filters: location, date, sort, category.
- Org-level activity history, agreements, relationship manager, performance metrics, "recently onboarded", per-category counts.
- Typed `/admin/organizations/{id}` response (X3); list `meta` (X1).

## 12. Phase 14 – Partner Account Management

- Account **list / search / detail** (id, holder, email, role, status, last login, created/updated).
- Invitation **status, expiry, resend, revoke**; account **deactivate / suspend / reactivate**.
- Partner **roles and permissions**; admin-initiated password reset.
- Account-level history; filters (role, invitation, date); account metrics.
- Read of "already has an account" (duplicate prevention only via 409).

## 13. Phase 15 – Communication & Notifications

- Admin **notification feed** (list / read / unread / archive / delete).
- **Ad-hoc email send**, attachments, **preferences**.
- Communication history by record; delivered/opened receipts.
- Template creation, activation, **version history**, placeholder list.
- Outbox: date-range/type server filters, related-record links, typed rows (field names guessed).

## 14. Phase 16 – Website CMS

- Homepage / hero / banners, services, industries, navigation menus.
- **Media library** and image upload/replace/delete.
- **SEO fields** (title, description, canonical, Open Graph).
- **Scheduled publication**; category filter + sorting params; `updated_at/by`.
- "Unpublished" status; approval/publication **audit history**; page owner field.
- Rich-text/HTML body (plain string only); Content Administrator permissions undefined.

## 15. Phase 17 – Admin Users & Roles

- GET-by-id, **search, pagination**, profile update.
- Permission matrix / editing; **suspend / reactivate** (only active/deactivate).
- Admin-initiated password reset; invitation list / **resend** / status.
- Created / updated / last-activation dates, contact fields.
- Per-user activity endpoint; typed `status` enum.
- Only `super_administrator` and `business_development_manager` fully implemented in backend; `partner_reviewer`/`content_administrator` unconfirmed [V].

## 16. Phase 18 – Reports & Analytics

- Date filter on applications / partners / outbox lists.
- Assignee and category filters; IT / Non-IT split.
- Review turnaround, onboarding progress/duration/document completion KPIs.
- Partner-account metrics; completed follow-ups + trends.
- Document-review and communication-history reports.
- PDF / Excel export; CSV report titles/generation date (filename only).
- Typed overview/KPI totals so reports aren't page-limited (row-based charts cap at 500 rows).

## 17. Phase 19 – Audit Logs & System Settings

- Audit: **get-by-id**, text search, sort, guaranteed total.
- Outcome/status, **IP / device**, before/after values, event-type catalogue, **export**.
- Security-event classification.
- Settings: categories, types, descriptions, defaults, typed schema, secrets API, **security-policy API** (MFA / password / session policy).
- Documented shape of `GET /admin/settings` (assumed).

## 18. Phase 20–21 – Integration, Production Readiness, PRD Gap Closure

- Business decisions [D]: 3-year / 50-personnel / INR 2 crore rule per pathway; retention periods + secure-deletion process; named queue owners, response targets, escalation; hosting / email / CRM / calendar / private-storage providers; malware scanning go-live requirement; role→module sign-off.
- Meeting confirm/decline/cancel: built, live behaviour + requester notification unverified.
- Own sessions list/revoke and recovery-code rotation (backend supports; UI not built).
- `/health*` status page and newsletter CSV (only if business wants).
- Hosting: SPA fallback for unknown paths, HTTPS, CSP/security headers [O].
- Privacy-request procedure documented; legal-retention checks before "execute deletion" [D].

## 19. Phase 22–23 – Partner Portal Foundation & Authentication

- No partner roles/permissions in the contract (PRD requires role-based access) (X8).
- Partner MFA policy unknown; session-expiry timing undocumented.
- No change-password endpoint (X11); no session persistence (X10).
- Cannot distinguish unactivated vs suspended partner on login.

## 20. Phase 24 – Partner Invitation & Activation

1. Invitation / account **status + delivery result** on organization or list endpoint.
2. **Resend / revoke** endpoint with rate limiting.
3. **Distinct error codes** for expired / used / revoked tokens (currently one generic 400).
4. Documented **password policy**.
5. Confirmation that the email link targets `/partner/activate?token=`.
6. Provisioning **history** (audit action names unverified).

## 21. Phase 25 – Partner Dashboard

- In-app notification feed with **read state / unread count / mark-as-read**.
- Typed notification and enquiry rows (field names guessed); enquiry status enum (no "open" count).
- Document-request resource (deadlines, status); account status/identifier on `/auth/me`.

## 22. Phase 26 – Company Profile

- Missing profile fields: trading name, company type, state/region/city, primary industry, core competencies, operating model, geographic coverage, years of experience, office locations, workforce capabilities, financial reporting period, additional contact fields.
- Per-field **editable vs approval-required** metadata (which fields go via `PUT` vs change request is undocumented).
- Previous/new values in revisions; document references on the profile.
- Field-clearing (null) semantics – empty strings rejected.

## 23. Phase 27 – Partner Documents

- Documented **file size limit** (none stated).
- **Malware scanning** (X12); retention / secure deletion (X13).
- Additional-document **request resource**: deadline, status, link from upload to request.
- Per-document **lock / permission flags** (accepted-doc lock is a UI assumption).
- Multiple documents per category semantics.

## 24. Phase 28 – Partner Application Status Tracking

- Partner-visible **eligibility outcome** (admin `EligibilityOut` is reviewer-only).
- Decision date/reason as dedicated field (derived from history note).
- Information-request **due date, status enum, request→document link**; `kind` enum on messages.
- Account provisioning / activation timestamps; operational status.
- Typed explanations per history event; `last_updated` on `ApplicationOut`.

## 25. Phase 29 – Partner Onboarding

1. **Onboarding record** with reference, status/stage list, initiation, update and completion timestamps.
2. Partner-visible **checklist / task API** (name, description, status, required action, due and completion dates, linked document category).
3. Onboarding-specific **history and messages** linked to a task.
4. Partner-visible **provisioning / activation dates** and operational status.
5. Request due dates, status enum, request-to-document linking; per-document onboarding requirement flags.
6. Documented partner permissions.

---

## 26. Addendum – items missed in the first pass

### 26.1 Missing backend capabilities
| # | Need | Source |
|---|---|---|
| M1 | **Reviewer/assignee picker endpoint for non-super-admin roles** (BD manager, reviewer). `/admin/users` is super-admin only, so they can't pick or name assignees. | B3, G1 |
| M2 | **Six allocation stages** (PRD §28) as first-class statuses with timestamps, owners and notes, or a documented mapping to `PortalStatus`. | B7 [D] |
| M3 | **Discussion / communication thread endpoint** per record (internal vs external, sender, timestamp). Today only follow-ups/notes/messages are available. | G4 |
| M4 | **Typed `/admin/launch-readiness` response** (gates, owners, status). UI renders raw JSON. | M3 |
| M5 | **Typed organization-detail schema** incl. which financial fields each role may see. | Phase 13 |
| M6 | **Staff access to partner profile-change requests** with before/after values (`admin/profile-change-requests` exists but diff data is missing). | Phase 13/26 |
| M7 | **Partner-criteria exceptions workflow** (approved-exception record, approver, reason). | C3 |
| M8 | **Dedicated strategic queue / owner / response target** (not just a `type=strategic` enquiry). | F7 |
| M9 | **Which document categories are mandatory** per pathway, exposed by the API (UI currently guesses: all submitted docs must be accepted). | Phase 7/12 |
| M10 | **Documented upload size/type limits for CMS attachments** (UI only learns via 413/415). | H3 |
| M11 | **Meeting module**: real calendar check, requester notification on confirm/decline/cancel, calendar integration decision. | E5, N2 [D] |
| M12 | **Privacy requests**: documented procedure for "access/correction" completion (UI only records a status; actual export/correction is outside the system); legal-retention checks before "execute deletion" (irreversible). | M2, Phase 21 [D] |

### 26.2 Auth/session details to confirm or document
1. Format of the **password-reset email link** (query param name, path, target origin). Frontend assumes `?token=`.
2. Whether **`/auth/refresh` preserves MFA-verified state**.
3. **Password policy** (min length etc.; frontend uses 8 as a placeholder).
4. **Staff invitation** accept flow and link target (accept-invitation page was listed as pending in Phase 3).
5. Token/session **lifetimes** (access, refresh, partner vs staff).
6. Partner MFA: required, optional or off.

### 26.3 Behaviour that must be verified live by backend/QA (UI built against the contract only)
- `meta.total` / pagination key names on every list (`total` vs `total_count`, page count).
- Per-role **403 matrix**: which staff roles get 403 on each endpoint (outbox, templates, content actions, audit, settings, organizations, documents, strategic).
- `deactivate` / `role` return **409** for self-change and for removing the last Super Administrator.
- CSV exports (`enquiries.csv`, `applications.csv`): content for non-super roles, strategic exclusion, 10,000-row cap behaviour.
- Audit: real `action` / `record_type` values (invitation, user, document, privacy events), whether filters are exact or partial match, `meta` contents, `organization_id` filtering.
- Outbox/notification rows: real field names (UI guesses `type|template_key|template|kind|event`, `recipient|to|to_email|email`, `last_error|error|failure_reason`); template placeholders and 422 messages.
- `GET /admin/settings` real shape (UI assumes `stored/settings/values/current` + `keys/available_keys/...` or flat map).
- Partner notification and enquiry row field names (`type|template|subject`, `status`, `created_at|sent_at`; `reference_number|reference|id`, `enquiry_type|type`).
- Enquiry `documents` keys (UI assumes `id` + a filename key); enquiry status values for "reopen" semantics.
- Which profile fields the partner `PUT /partner/organization` accepts directly vs requiring a change request.
- Strategic: staff really can read `type=strategic` rows, and non-super roles are denied across list, detail, search, CSV, documents, outbox, audit, overview/KPIs, notifications.
- Meeting confirm/decline/cancel end to end.
- Partner data isolation: organization derived from token only; cross-partner access returns 403/404.
- Enquiry/application attachment downloads: content-type headers, 403/404/409.
- Invitation email delivery and `mfa-reset` behaviour; draft/publish reflected on the public website.

### 26.4 Ops / infrastructure (not code, but backend-team owned)
- Email provider configuration and delivery confirmation (N1).
- Private storage, **monitoring, backups, incident response, rollback** evidence (N3); `/health*` endpoints exist but are unused.
- CRM / calendar / analytics / support-ticket integrations – decision pending (N2).
- Host SPA fallback, HTTPS, CSP and security headers for the frontend host.
- Named owners for general, project, partner and strategic queues, response targets and escalation.
- Backend `openapi.json` should be re-published whenever endpoints change; frontend is built strictly from it (last fetched 2026-11-10).

---

## 27. Phase 30 – Partner Project & Engagement Visibility
Verified against live OpenAPI 2026-11-10: **no partner-facing project/engagement API exists**, so the whole module is **[B]**. Frontend ships only `/partner/projects` (honest unavailable state + `pathway` from `GET /partner/applications`).
- **[B]** `GET /partner/projects` and `GET /partner/projects/{id}`: org derived from token, only records an admin has explicitly shared, cross-partner access 403/404, paginated, no internal notes/commercial data. Fields: reference, title, category, short description, service area, assignment date, status + label, expected milestones, partner-visible instructions, latest update, authorised contact.
- **[B]** Engagement type enum on projects (direct / vendor / subcontracting). Strategic/M&A must never be serialised to ordinary partner accounts.
- **[B]** Project status enum with partner-facing labels (confirmed values; illustrative ones like Assigned / In progress / On hold / Completed / Cancelled are NOT assumed).
- **[B]** Milestones (name, description, target date, status, completion date) – none exist.
- **[B]** Partner actions: acknowledge assignment / confirm participation / respond to engagement request / submit requested information (endpoints, schemas, state rules). None exist.
- **[B]** Project↔document link: Phase 27 `/partner/documents` has no project association, no project-shared (admin→partner) documents and no requested-document status per project.
- **[B]** Project↔message link: `/partner/applications/{id}/messages` is application-only; no project communications, sender/contact or required-response flag.
- **[B]** Admin-side project assignment/authorisation workflow: existing `/admin/enquiries/{id}/assign` and `/reviewer/applications/{id}/assign` assign leads/applications, not partners to projects; no admin endpoint shares a project with a partner.
- **[B]** Dashboard aggregates (active engagements, recent assignments, pending responses, upcoming milestones) – need the above first.
- **[V]** `GET /partner/applications` `pathway` is the only engagement data today; confirm it should not be treated as an assignment.
- **[D]** Who authorises visibility, and whether vendor/subcontract engagements share the same project model as direct engagements.

## 28. Phase 31 – Partner Communication & Notifications
Verified against live OpenAPI 2026-11-10: partner side has only `GET/POST /partner/applications/{id}/messages` and `GET /partner/notifications` (email dispatch rows, untyped). Frontend ships `/partner/messages` (history + reply to requests) and `/partner/notifications` (email list, page/page_size). No badge, mark-as-read or preferences UI because nothing can persist them.
- **[B]** In-app notification feed: `GET /partner/notifications` returns only email type/status (untyped dict). Need typed rows: id, category (enum), title, description, created_at, `read_at`, related record (application / document / onboarding / project id) and partner-facing link target.
- **[B]** Read state: `GET /partner/notifications/unread-count`, `POST /partner/notifications/{id}/read`, `POST …/unread`, `POST /partner/notifications/read-all`. Needed for header/nav badge and unread filter; must be scoped to the token's partner.
- **[B]** Notification categories/events enum (application update, information request, document request, document review, onboarding, activation, project, admin communication). None are documented, so none are shown.
- **[B]** Notification preferences: `GET/PUT /partner/notification-preferences` (email on/off, in-app on/off, per category). Not exposed in the UI until persisted.
- **[B]** List `meta` (`total`, page count) on `/partner/notifications`; today "Next" is guessed from a full page. Add type/status/date filters.
- **[B]** Cross-application partner inbox: messages exist only per application. Need `GET /partner/messages` (org-wide, paginated, filter by application/kind/read) and `GET /partner/messages/{id}`.
- **[B]** Message read state (`read_at`, mark read) and unread counts; "awaiting response" flag/due date on requests (contract has none).
- **[B]** Message attachments: list of partner-visible attachments with authorised, audited download via the existing document service (no public URLs); upload on partner reply with size/type limits.
- **[B]** Message sender label/contact (reviewer identity is deliberately withheld; confirm an approved display name such as "Coral Swift team") and an enumerated `kind` list (currently free text).
- **[B]** Partner-initiated message (not only reply to an open request) and reply to any reviewer message; confirm whether `in_reply_to` is restricted to open information requests.
- **[B]** Admin-side visibility: delivery status, partner read/replied status and the partner reply thread for each communication (admin outbox shows emails only).
- **[B]** Admin "send partner-visible message" with explicit `partner_visible` flag, so internal notes, reviewer comments, staff follow-ups and strategic/M&A content can never be serialised to partners.
- **[V]** Cross-partner access: confirm 403/404 for another org's application messages and notifications (never live-tested; no partner account, X14).
- **[V]** Confirm partner messages/notifications never include strategic/M&A or internal-note content (X7).
- **[D]** Whether email is the only channel; real-time/push (SSE/websocket) and SMS are not assumed.

## 29. Phase 32 – Partner Discussions, Meetings & Follow-ups
Verified against live OpenAPI 2026-11-10: **no partner-facing discussion, meeting or follow-up API exists.** Follow-ups (`POST /admin/enquiries/{id}/follow-ups[/{id}/complete]`) and meeting confirm/decline/cancel (`/admin/meetings/{id}/…`) are staff-only; `POST /meetings` is a public enquiry request. Frontend ships `/partner/discussions` (redirect to `/partner/messages`), `/partner/follow-ups` (open/answered information requests, reply via the existing messages endpoint) and `/partner/meetings` (honest unavailable state).
- **[B]** Discussions: `GET /partner/discussions` and `GET /partner/discussions/{id}` (org from token, only records explicitly shared, paginated, cross-partner 403/404). Fields: subject, description, related record (application / onboarding / engagement id), participants (approved display names only), status enum, created_at, last_activity_at, `requires_response` flag. Today only per-application messages exist.
- **[B]** Discussion messages: `GET/POST /partner/discussions/{id}/messages` with sender label, timestamp, attachments (authorised, audited download via the document service; upload size/type limits) and an idempotency key for replies.
- **[B]** Admin "create discussion / share with partner" with explicit `partner_visible` flag, so internal notes, private admin discussions, staff follow-ups, strategic/M&A content and eligibility/decision comments can never be serialised to partners.
- **[B]** Meetings: `GET /partner/meetings` and `GET /partner/meetings/{id}` (upcoming/past filter, date range, pagination). Fields: title, purpose, start/end, timezone, organizer (approved label), participants, status enum + labels, location or online details (only if real), related application/engagement, shared notes, attachments. No meeting record is partner-visible today.
- **[B]** Meeting actions: accept, decline, request reschedule (e.g. `POST /partner/meetings/{id}/respond`) with permitted status transitions and an admin-visible response. Existing `/admin/meetings/{id}/confirm|decline|cancel` act on enquiry meeting requests, not partner invitations.
- **[B]** Meeting-change notifications (invitation, change, cancellation) to the partner.
- **[B]** Follow-ups: `GET /partner/follow-ups` and `GET /partner/follow-ups/{id}` for staff follow-ups explicitly shared with the partner. Fields: subject, description, related record, assigned contact (approved label), due_at, created_at, status enum, category enum, requested partner action, completion info. Staff `FollowUpOut` has only note/due_at/completed_at and no visibility flag, status or category.
- **[B]** Partner follow-up actions: submit information, link an uploaded document (no document↔follow-up link exists), and explicit partner-completion permission (`POST /partner/follow-ups/{id}/respond|complete`); partners must never modify staff records.
- **[B]** Admin visibility: partner replies/responses, completion and status history for each shared discussion, meeting and follow-up.
- **[B]** Partner notification events (new discussion, reply, meeting invite/change, follow-up request, due-date change, response, completion) through the Phase 31 notification feed (§28); today `/partner/notifications` is an email outbox only.
- **[B]** Server-side search/status/date/sort filters and `meta` totals on all three lists (otherwise filtering is limited to the loaded page).
- **[V]** Cross-partner access: 403/404 for another org's discussions, meetings, follow-ups and attachments (never live-tested; no partner account, X14).
- **[V]** Confirm partner payloads never include internal or strategic/M&A content (X7).
- **[D]** Whether discussions are a new resource or an extension of application messages; whether meeting links/calendar integration are in scope (M11); which follow-up statuses and categories exist.

## 30. Phase 33 – Partner Team & User Management
Verified against live OpenAPI 2026-11-10: **no partner-facing team API exists.** The model allows several users per organization (`InvitationIn.organization_id`; `/auth/me` returns `organization`), but invitations are super-administrator only (`POST /reviewer/invitations`, returns just `organization_id`), `/admin/users*` (list/invite/role/activate/deactivate/mfa-reset) is staff-only with `StaffRole`, and acceptance is `POST /auth/invitations/accept`. Frontend ships `/partner/team` (own account + honest unavailable state); no invite or detail routes.
- **[B]** Team list/detail: `GET /partner/team` and `GET /partner/team/{id}` (org from token, never from the request; cross-organization 403/404; paginated). Fields: id, full_name, email, partner_role, account_status, invitation_status, created_at, `last_login_at`, organization ref. Never password hashes, tokens, MFA secrets or sessions.
- **[B]** Partner role model, separate from `StaffRole`: enum (e.g. organization owner / administrator / manager / member – to be defined by the backend), a `GET /partner/team/roles` list for the invite form, and a documented permission matrix per role enforced server-side on every `/partner/*` endpoint. `MeOut` must return the caller's `partner_role` and permissions so the UI can hide controls (UX only).
- **[B]** Invite: `POST /partner/team/invitations {email, full_name, partner_role, phone?}` for owner/administrator only, with documented validation, duplicate email/pending-invitation check (409 with a stable error code), no role above the inviter's own, using the existing invitation/activation flow.
- **[B]** Invitation management: status enum (pending / accepted / expired / cancelled), `expires_at`, `GET /partner/team/invitations`, `POST …/{id}/resend`, `POST …/{id}/cancel`, with cancelled/expired tokens rejected by `/auth/invitations/accept`.
- **[B]** Access actions: `POST /partner/team/{id}/role`, `/activate`, `/deactivate`, `DELETE /partner/team/{id}`. Server must block removing/deactivating the owner without ownership transfer, removing the last administrator, self-elevation, roles above the actor's own, and cross-organization targets. Deactivation must revoke sessions/refresh tokens.
- **[B]** Ownership transfer process (owner → another member) with confirmation and audit.
- **[B]** Audit trail for invite, resend, cancel, role change, (de)activation and removal (actor, target, before/after, timestamp), visible to Coral Swift staff.
- **[B]** Admin Console visibility of partner team members per organization, and a way to provision/recover an owner.
- **[B]** Server-side search/filter (role, status) and `meta` totals on the team list.
- **[B]** Team-event notifications (invitation sent/accepted, role changed, deactivated) through the Phase 31 notification feed (§28).
- **[V]** Cross-organization access: 403/404 for another org's members, invitations and role changes (never live-tested; X14).
- **[V]** Confirm existing partner endpoints honour partner roles once defined – today any partner user of an organization has identical access.
- **[D]** Role names and permission matrix; multiple owners per organization; invitation expiry period; whether phone number is collected.

## 31. Phase 34 – Partner Performance Overview & Scorecards
Verified against live OpenAPI 2026-11-10 (115 paths): **no partner-facing performance, KPI, scorecard, rating, evaluation, feedback, milestone, engagement, trend or export endpoint exists.** Only staff-only reports exist (`/admin/reports/kpis`, `applications.csv`, `enquiries.csv`, `newsletter.csv`) and must not be reused. Frontend ships `/partner/performance` (unavailable state, own application history from `GET /partner/applications`, feasibility table); no metrics, charts, scores or exports.
- **[B]** Partner-scoped performance read API: `GET /partner/performance/summary` and `/indicators` (org from token, never from the request; cross-organization 403/404). Each metric must document: data source, calculation method, reporting period, applicable engagement population, `partner_visible` flag, and whether history is reliable. Candidates only if the data really exists: engagement completion, milestone progress, delivery/document timeliness, response turnaround, compliance status. No arbitrary weighted scores.
- **[B]** Engagement/project history records feeding it (see §27): `GET /partner/engagements` with name, reference, category, start/end dates, status enum, assigned role, completion info; counts (assigned / active / completed) with `meta.total`.
- **[B]** Milestones per engagement (due date, completed date, status) so milestone progress and delivery timeliness can be computed server-side.
- **[B]** Scorecard resource: `GET /partner/scorecards` and `/{id}` with evaluation period, category, rating/result (documented scale), evaluation date, partner-shared feedback, improvement recommendations, and history of score changes. Internal reviewer notes, confidential assessments and scoring discussions excluded by the partner serializer.
- **[B]** Partner-visible feedback: `GET /partner/feedback` (date, related engagement, category, observations, strengths, recommendations, optional acknowledgement status). Read-only for partners; historical evaluations cannot be modified.
- **[B]** Explicit **publish-to-partner** control in the Admin Console (draft → published, with who/when); internal assessments never auto-published. Admin Console screens to record engagement/performance data.
- **[B]** Trend data: time-bucketed series (engagement activity, completions, milestone progress, indicator history) with period labels and minimum-record rules, so the UI can refuse to chart insufficient data.
- **[B]** Partner-scoped report/export: `GET /partner/performance/report` (CSV and/or PDF) limited to published, partner-visible data; no internal administrative fields; audited.
- **[B]** Date-range and engagement filters plus pagination `meta` on all of the above.
- **[V]** Cross-organization access to performance data, scorecards and exports returns 403/404, and internal assessments are unreachable by partners (never live-tested; X14).
- **[V]** Strategic/M&A engagements are excluded from partner performance serialisers (X7).
- **[D]** Which indicators are partner-visible; rating scale and review cadence; whether partner acknowledgement of feedback is wanted; whether comparisons between partners are ever shown (recommended: no).

## 32. Phase 35 – Partner Settings & Security
Verified against live OpenAPI 2026-11-10 (115 paths). **Exists (shared, used by the UI):** `GET /auth/sessions` (id, created_at, last_used_at, user_agent, current), `DELETE /auth/sessions/{id}`, `POST /auth/mfa/enroll|confirm|recovery-codes`, `POST /auth/password-reset/request|confirm`, public `POST /privacy/requests` (email, kind access|correction|deletion, details). **Missing:** change-password, personal-profile edit, MFA status/disable, notification preferences, privacy-request status. Frontend ships `/partner/settings` (read-only account, security & sessions, privacy); nothing simulated.
- **[B]** Authenticated change-password for partners (`POST /auth/change-password {current_password, new_password}`; verifies the current password, applies the documented policy, optionally revokes other sessions, audited, rate-limited). Same as X11.
- **[B]** Password policy document or endpoint (min length, complexity, history) so the UI can show guidance instead of relying on backend errors.
- **[B]** Personal account edit: `PATCH /auth/me` or `/partner/account` (full_name, phone), with rules for which fields are verified/locked, re-verification of email changes, and audit. Org-level data stays in `PUT /partner/organization`.
- **[B]** `MeOut` additions: account status (enum: active / pending activation / restricted / deactivated), phone, `partner_role` (see §30), `mfa_enabled`, `mfa_required`, `last_login_at`. Partners must not be able to change status, approval or activation.
- **[B]** MFA lifecycle for partners: status, disable (needs current code or password), re-enroll rules (what happens to an existing secret on a second `/mfa/enroll`), and a documented policy (required / optional / off) for partners.
- **[B]** Sessions: `expires_at` per session, `DELETE /auth/sessions` (sign out all other devices), device/IP/location summary beyond raw user agent; password change and deactivation must revoke sessions.
- **[B]** Notification preferences: `GET/PUT /partner/notification-preferences` (channel × event category, with mandatory notices that cannot be disabled), shared with the Phase 31 feed (§28).
- **[B]** Authenticated partner privacy requests: `POST/GET /partner/privacy-requests` (identity from token, not body email) returning reference, kind, status (received / in_progress / completed / rejected), resolution note and created_at, so partners can view status. Current endpoint is unauthenticated and could be used for another person's email.
- **[B]** Account closure/deletion workflow: staff review, legal-retention check, secure deletion and audit retention (X13, M12); partner-visible outcome. No immediate deletion from the portal.
- **[B]** Admin Console visibility of partner privacy requests and of security events (password change, MFA changes, session revocation) per account.
- **[V]** Confirm `/auth/sessions` and `DELETE /auth/sessions/{id}` are limited to the caller's own sessions (404/403 for others) and that revoking a session invalidates its refresh token.
- **[V]** Confirm partner login enforces `mfa_required` / `mfa_enrollment_required` and that `/mfa/enroll` for an already-enrolled account does not silently replace the secret.
- **[V]** Responses never include tokens, secrets or hashes (never live-tested; X14).
- **[D]** Partner MFA policy, session lifetimes, which notification categories are mandatory, privacy-request SLA and retention rules.

## Suggested backend priority

**Critical / before go-live:** §26.3 live verification (strategic authz, 403 matrix, CSV) · §26.2 auth details · X7 strategic authz verification · X1/X3 typed totals for overview & KPIs · X6 strategic flag on audit/outbox · X13 retention + secure deletion · X9 CORS · X14 test accounts for live MFA/role verification.

**High (unblocks built-but-hollow UI):** Phase 30 partner project/engagement API (§27) · Phase 29 onboarding/checklist API · Phase 24 invitation status/resend/revoke · Phase 14 account list/status · Phase 15 notification feed + partner notification read state · Phase 31 partner notification feed/read state/preferences + cross-application messages (§28) · Phase 32 partner discussions/meetings/follow-ups API (§29) · Phase 33 partner team/roles/invitation management API (§30) · Phase 34 partner performance/scorecard/feedback API (§31) · Phase 35 change-password, MFA status/disable, partner privacy-request status, notification preferences (§32) · Phase 27 document-request resource + size limit.

**Medium:** X2 server search/sort/filters · X4 names + updated_at · X5 transition tables · assignment history · audit export/search · CMS media/SEO/scheduling.

**Low:** health page, newsletter CSV, PDF/Excel export, extended profile fields.

