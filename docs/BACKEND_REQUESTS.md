# Coral Swift – Backend Requests (Admin Console, Partner Portal, Public Portal)

For: Backend team · From: Frontend · Date: 2026-11-10
Source: `BACKEND_GAPS.md` (full detail). Closed already (Phase 37): change-password (X11), role→module matrix (X8), status transition tables (X5), parts of enquiry/assignment/document/notification gaps. Please check `BACKEND_DEPENDENCY_REGISTER.md` and skip anything already delivered.

Rule: the frontend never simulates missing data. Anything below that is missing shows as "not available" in the UI until you deliver it.
Please re-publish `openapi.json` after each change.

Tags: **[BUILD]** new endpoint/field · **[FIX]** change existing behaviour · **[VERIFY]** confirm/test and reply · **[OPS]** deployment · **[DECIDE]** business decision

---

## A. Must-do before go-live (all portals)

1. **[OPS] CORS** – allow the deployed frontend origins (coralswift.com, admin and partner hosts, localhost for dev). Preflight is currently rejected.
2. **[OPS] Test accounts** – 4 staff roles with MFA + 1 partner account, so we can verify login/MFA/refresh/logout live. Nothing has been tested end to end.
3. **[VERIFY] Strategic/M&A authorization** – only permitted roles may see `type=strategic` in: list, detail, search, CSV, documents, outbox, audit, overview/KPIs, notifications. Never in any partner payload.
4. **[VERIFY] Per-role 403 matrix** – send us which staff role gets 403 on each endpoint (outbox, templates, content, audit, settings, organizations, documents, strategic).
5. **[BUILD] Pagination meta** – every list returns `meta.total` and page count; confirm key names (`total` vs `total_count`).
6. **[BUILD] Typed schemas** (no untyped dicts) for: `/admin/overview`, `/admin/reports/kpis`, `/admin/settings`, `/admin/organizations/{id}`, `/admin/launch-readiness`, outbox/notification rows, partner notification/enquiry rows, enquiry `contact/company/details/documents`.
7. **[BUILD] Strategic flag** on audit, outbox and notification rows (frontend currently hides by regex).
8. **[BUILD] Session persistence** – HttpOnly cookie or refresh flow so a page reload doesn't sign users out. Confirm `/auth/refresh` keeps MFA-verified state.
9. **[BUILD] Upload safety** – malware scanning (staff + partner + public uploads), documented size/type limits, document retention dates, secure deletion.
10. **[DECIDE] Auth details to document**: password-reset email link format (we assume `?token=`), password policy (we use min 8), token lifetimes, partner MFA policy (required/optional/off), staff invitation accept link.
11. **[FIX] Login errors** – distinguish not-activated / suspended / locked / wrong password (today one generic 401). Same for expired/used/revoked invitation tokens (today one generic 400).

---

## B. Admin Console

### Cross-cutting
- **[BUILD]** Server-side search `q`, sort, date-range filters on: `/reviewer/applications`, `/admin/organizations`, `/admin/users`, `/admin/notifications`, `/admin/content`, `/admin/audit`.
- **[BUILD]** `updated_at` and actor **names** (not only ids) on applications, enquiries, history, notes, audit.
- **[FIX]** `/auth/me` should not authenticate partner accounts for the console (or return a clear account type).
- **[BUILD]** Assignee/reviewer picker endpoint usable by non-super-admin roles (`/admin/users` is super-admin only).

### Dashboard & Applications (Phases 4–6)
- **[BUILD]** Counts for pending / approved; recent decisions (with decision timestamp); recent onboarding activity feed; cross-application "documents awaiting verification".
- **[BUILD]** Applications list rows: applicant name, email, phone, category, last updated; date filter.
- **[BUILD]** Review workflow: checklist/scoring endpoints, start-review / recommend / decision endpoints, reversal/reconsideration, an explicit approved state (or documented mapping), eligibility-exception workflow (approver, reason).
- **[DECIDE]** Eligibility thresholds per pathway (3 years / 50 personnel / INR 2 crore).

### Onboarding & Partners (Phases 7, 13, 14)
- **[BUILD]** Onboarding records: initiate, progress, required info, complete; list with applicant details and filters.
- **[BUILD]** Which document categories are mandatory per pathway.
- **[BUILD]** Organization list: category/type and contact person/email/phone; location/date/sort filters; org activity history, agreements, relationship manager.
- **[BUILD]** Staff edit of partner profile; staff view of profile-change requests with before/after values.
- **[BUILD]** Partner accounts: list/search/detail (holder, email, role, status, last login), invitation status/expiry/resend/revoke, suspend/reactivate, admin-initiated password reset, account history.

### Enquiries, Strategic, Assignment, Follow-ups (Phases 8–11)
- **[BUILD]** Enquiry list fields: phone, project category/IT vs Non-IT, last updated, assignee name; sort param.
- **[BUILD]** Enquiry activity/audit and assignment-history endpoints; separate note types (internal / follow-up / communication); reply/external message endpoint.
- **[BUILD]** Strategic: documented staff read/list access, `discussion_type` field + filter, assessment outcome endpoint, dedicated queue/owner/response target.
- **[BUILD]** Assignment: workload aggregate endpoint, ability to clear an application assignee, define the six allocation stages (or map to statuses).
- **[BUILD]** Follow-ups: global list, update/reschedule/reassign/cancel, status field, date filter + counts. Discussion thread endpoint per record.
- **[DECIDE]** Meeting/calendar integration; partner/meeting assignment workflow.

### Documents, Comms, CMS (Phases 12, 15, 16)
- **[BUILD]** Admin document list/search/filter; staff-side review history; admin upload/replace; enquiry-attachment list; separate "replacement requested" status.
- **[BUILD]** Admin notification feed (list/read/unread/archive); ad-hoc email send; delivery status; template create/activate/version history/placeholders; typed outbox rows with date/type filters.
- **[BUILD]** CMS: homepage/hero/banners, services, industries, navigation; media library + image upload; SEO fields; scheduled publish; "unpublished" status; `updated_at/by`; rich-text body; category filter and sort; publish audit history.

### Users, Reports, Audit, Settings (Phases 17–19)
- **[BUILD]** Admin users: get-by-id, search, pagination, profile update, suspend/reactivate, invitation list/resend/status, permission matrix, per-user activity. Confirm `partner_reviewer` and `content_administrator` roles are implemented.
- **[BUILD]** Reports: date/assignee/category filters, review turnaround, onboarding duration, partner-account metrics, PDF/Excel export, totals that aren't page-limited.
- **[BUILD]** Audit: get-by-id, text search, sort, IP/device, outcome, before/after values, event-type catalogue, export. Confirm real `action`/`record_type` values.
- **[BUILD]** Settings: typed schema with categories/defaults/descriptions, secrets API, security-policy API (MFA/password/session).
- **[VERIFY]** `deactivate`/`role` return 409 for self-change and last Super Administrator; CSV exports (non-super roles, strategic exclusion, 10,000-row cap).

### Ops (Phases 20–21)
- **[OPS]** Email provider config + delivery confirmation; private file storage; monitoring, backups, incident response, rollback evidence.
- **[DECIDE]** Retention periods, hosting/CRM/calendar providers, queue owners and response targets, privacy-request procedure (access/correction completion, legal-retention check before deletion).

---

## C. Partner Portal

### Account & Security (Phases 22–24, 35)
- **[BUILD]** Partner roles and permissions model; `MeOut` returns `partner_role`, account status (active / pending / restricted / deactivated), phone, `mfa_enabled`, `mfa_required`, `last_login_at`.
- **[BUILD]** Invitations: status + delivery result, expiry, resend/revoke with rate limit, distinct error codes (see A11).
- **[BUILD]** Personal account edit (`PATCH /auth/me`: full_name, phone) with audit.
- **[BUILD]** MFA lifecycle: status, disable, behaviour on re-enroll.
- **[BUILD]** Sessions: `expires_at`, `DELETE /auth/sessions` (sign out all others), revoke on password change/deactivation.
- **[BUILD]** Authenticated partner privacy requests `POST/GET /partner/privacy-requests` (identity from token, status/reference/resolution). Current public endpoint takes any email.
- **[BUILD]** Account closure workflow (staff review, retention check, audit); admin visibility of partner privacy requests and security events.
- **[VERIFY]** `/auth/sessions` limited to caller's own sessions; revoking invalidates the refresh token; `/mfa/enroll` doesn't silently replace an existing secret; responses never contain tokens/secrets/hashes.

### Profile, Documents, Application, Onboarding (Phases 25–29)
- **[BUILD]** Profile fields missing: trading name, company type, state/city, primary industry, core competencies, operating model, coverage, years of experience, offices, workforce, financial period, extra contacts. Per-field flag: direct edit vs change request. Allow null-clearing. Revisions with old/new values.
- **[BUILD]** Documents: size limit, document-request resource (deadline, status, link to uploaded document), lock flags, multiple-per-category rules.
- **[BUILD]** Application status: partner-visible eligibility outcome, decision date/reason as fields, `last_updated`, information requests with due date/status enum/document link, `kind` enum on messages, activation timestamps.
- **[BUILD]** Onboarding: record (reference, stage list, timestamps), partner-visible checklist/task API (name, status, required action, due/completion, linked document category), onboarding history/messages, provisioning dates.

### Notifications, Messages, Discussions, Meetings, Follow-ups (Phases 25, 31, 32)
- **[BUILD]** Typed notification feed: id, category enum, title, description, created_at, `read_at`, related record, link; `unread-count`, mark read/unread/read-all; `meta.total` and filters.
- **[BUILD]** Notification preferences `GET/PUT /partner/notification-preferences` (mandatory notices can't be disabled).
- **[BUILD]** Org-wide inbox `GET /partner/messages` (+ by id), read state, attachments (authorised download, upload limits), approved sender label, partner-initiated messages.
- **[BUILD]** Discussions `GET /partner/discussions[/{id}]` + messages; admin "share with partner" with explicit `partner_visible` flag so internal/strategic content can never leak.
- **[BUILD]** Meetings `GET /partner/meetings[/{id}]`, respond (accept/decline/reschedule), invite/change/cancel notifications.
- **[BUILD]** Follow-ups `GET /partner/follow-ups[/{id}]` for shared items; partner respond/complete; admin sees partner replies and status history.

### Projects, Team, Performance (Phases 30, 33, 34)
- **[BUILD]** Projects: `GET /partner/projects[/{id}]` (shared-only, org from token), engagement type, status enum with partner labels, milestones, partner actions (acknowledge/confirm/respond/submit info), project↔document and project↔message links, admin share workflow, dashboard aggregates.
- **[BUILD]** Team: `GET /partner/team[/{id}]`, partner role list, invite (409 on duplicate), invitation list/resend/cancel, role change/activate/deactivate/remove, ownership transfer, blocks (last admin, self-elevation, cross-org), audit trail, admin visibility.
- **[BUILD]** Performance: summary/indicators with documented calculation, engagements + milestones feeding it, scorecards, feedback, explicit publish-to-partner control (draft → published), trend series, partner-scoped CSV/PDF report.
- **[DECIDE]** Partner role names/matrix, multiple owners, invitation expiry, which indicators are partner-visible, rating scale, no partner-to-partner comparisons.
- **[VERIFY]** Cross-partner/org access returns 403/404 on applications, messages, notifications, discussions, meetings, follow-ups, team, performance, attachments. No strategic/M&A or internal-note content in any partner payload.

---

## D. Public Portal

- **[OPS]** CORS (A1); SPA fallback for unknown paths, HTTPS, CSP/security headers on the frontend host.
- **[BUILD]** CMS content endpoints (hero, banners, services, industries, navigation, media, SEO, scheduled publishing) – see B/Phase 16. **[VERIFY]** Draft/publish is reflected on the live public site.
- **[BUILD]** Public enquiry/meeting forms: scanning + documented size/type limits for attachments (413/415 today); meeting requests need a real calendar check and requester notification on confirm/decline/cancel.
- **[FIX]** `POST /privacy/requests` is unauthenticated and accepts any email – add verification (e.g. email confirmation) or rate limiting; document the completion procedure.
- **[DECIDE]** Newsletter CSV export (only if the business wants it).

---

## Suggested order

1. **Go-live blockers:** A1–A11.
2. **High (UI built but empty):** partner projects / onboarding / notifications / discussions / team / performance / settings APIs; invitation status; partner account list; document-request resource.
3. **Medium:** server search/sort/filters, actor names + `updated_at`, assignment history, audit export, CMS media/SEO/scheduling.
4. **Low:** health page, newsletter CSV, PDF/Excel export, extended profile fields.
