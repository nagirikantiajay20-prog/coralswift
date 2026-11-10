# Coral Swift Admin Console

Internal admin console for the Coral Swift platform (PRD "Phase 3": enquiries, partner applications, review, onboarding, content, users, reports, audit logs). The Public Portal is a separate project; the Partner Portal is a future integration against the same backend.

**Status:** see `docs/FINAL_PROJECT_ACCEPTANCE_REPORT.md` (Admin Console + Partner Portal implemented; not production-ready).

## Stack

React 19, TypeScript (strict), Vite, React Router, Tailwind CSS v4, shadcn-style components (Radix primitives), Lucide, TanStack Query, Axios, React Hook Form + Zod, Zustand (auth session only), Recharts, Sonner. Tests: Vitest + Testing Library. Lint: ESLint. Format: Prettier.

## Getting started

```bash
npm install
cp .env.example .env.development.local   # then edit (dev-only; production uses .env.production)
npm run dev                  # http://localhost:5173
```

| Command             | Purpose                         |
| ------------------- | ------------------------------- |
| `npm run dev`       | Dev server                      |
| `npm run build`     | Typecheck + production build    |
| `npm run typecheck` | TypeScript only                 |
| `npm run lint`      | ESLint                          |
| `npm test`          | Vitest                          |
| `npm run format`    | Prettier                        |

## Environment (`.env.example`)

- `VITE_API_BASE_URL`: backend base URL (`https://coralswift-backend.onrender.com`). Public: never put secrets in `VITE_` variables.
- Local dev: the backend's CORS allow-list rejects `localhost` origins (verified), so `.env.development.local` (dev mode only, so it never leaks into production builds) sets `VITE_API_BASE_URL=` (empty) and `DEV_PROXY_TARGET=<backend URL>`; Vite proxies `/api` server-side. Production builds call the backend directly, so the deployed frontend origin must be added to the backend CORS allow-list.

Never commit `.env*.local`. No URLs, tokens or secrets are hardcoded.

## Backend integration

1. Fill `src/config/endpoints.ts` from the backend API docs (paths only; methods and payloads live in each feature's `services/`).
2. Replace the stubs in `src/features/*/services` with real calls via `api` from `src/services/api/client.ts`; add types from the spec in each feature's `types/`.
3. Confirm the auth mechanism (Bearer token vs cookie) in `client.ts` and `authStore.ts`.

Until an endpoint is configured, its service throws `NotConfiguredError` and the UI shows that message. See `docs/ARCHITECTURE.md`.

## Dashboard

The dashboard (Phase 4) reads live data from the backend via TanStack Query; see docs/PROJECT_PROGRESS.md (Phase 4) for metric sources and pending endpoints. Sample data was removed.

## Authentication (Phase 3)

Backend: FastAPI, docs at `/docs`, spec at `/openapi.json`. Opaque **Bearer** tokens returned in the JSON body (no cookies). Response envelope `{success, message, data}`; errors `{success:false, message, error:{code, details[]}}`.

| Purpose | Endpoint |
| --- | --- |
| Login `{email,password}` -> `{access_token, refresh_token, expires_in, mfa_required, mfa_enrollment_required}` | `POST /api/v1/auth/login` |
| Refresh `{refresh_token}` (rotating, one-time use; reuse revokes session) | `POST /api/v1/auth/refresh` |
| Logout (Bearer) | `POST /api/v1/auth/logout` |
| Current account -> `{id,email,full_name,user_type,staff_role,organization}` | `GET /api/v1/auth/me` |
| MFA (TOTP) enroll / confirm / verify | `POST /api/v1/auth/mfa/{enroll,confirm,verify}` |
| Password reset request `{email}` / confirm `{token,new_password}` | `POST /api/v1/auth/password-reset/{request,confirm}` |
| Accept staff invitation `{token,password}` | `POST /api/v1/auth/invitations/accept` (UI not built) |

Flow: login -> (MFA enroll/verify if flagged) -> `/auth/me` -> session. Only `user_type=staff` with a `staff_role` may use the console. Tokens are kept **in memory only**; a reload signs out. A 401 triggers one single-flight refresh + retry, otherwise `/session-expired`.

Roles (`staff_role`): `super_administrator`, `business_development_manager`, `partner_reviewer`, `content_administrator`. The backend publishes no permission matrix: the frontend role->module map in `src/config/permissions.ts` is a **pending/unconfirmed** navigation hint; the backend enforces access.

Missing backend items: no change-password endpoint; HttpOnly-cookie refresh (would allow persistent sessions safely); permission-matrix endpoint; documented password policy; reset-email link format; typed `/admin/overview` schema; CORS entries for dev/prod frontend origins; whether `/auth/refresh` preserves MFA-verified state.

## Partner Applications (Phase 5)

Admin Console → Partner Applications lists and reviews applications from `GET /api/v1/reviewer/applications` (status/unassigned/page filters server-side; search, date range and sort apply to the loaded page). The detail page shows organization, business info, documents (authenticated download, per-document review), eligibility records, status history, internal notes, partner messages and the audit trail, with actions: assign reviewer (super admin), add note, request information, change stage. See `docs/PROJECT_PROGRESS.md` (Phase 5) for verified endpoints and pending backend requirements. Changing a stage never creates a partner account.

## Application Review (Phase 6)

`/admin/application-reviews` lists the review queue; `/admin/application-reviews/:id` is the review workspace (overview, documents, derived checklist, notes and information requests, decision and history). Actions use the verified `/api/v1/reviewer/applications/*` endpoints, including `eligibility-verifications`. Decisions are stage transitions that require a reason; they never create partner accounts. See docs/PROJECT_PROGRESS.md (Phase 6) for endpoints, rules and pending backend requirements.

## Partner Onboarding (Phase 7)
Routes: `/admin/approved-applicants` (listing), `/admin/approved-applicants/:id` (onboarding workspace), `/admin/onboarding` (dashboard). Super Administrator only (the `onboarding` module).
The backend has **no onboarding endpoints**. Onboarding is the PRD stage `pilot_onboarding` (then `scale_up`) of the reviewer application workflow, so this module reuses the Phase 5/6 APIs and components:
- Approved applicants = `GET /reviewer/applications?status=pilot_onboarding|scale_up`. Starting onboarding = recording the decision `pilot_onboarding` via `POST /reviewer/applications/{id}/transition` (workspace action "Record decision / change stage").
- Document verification = `POST /reviewer/applications/{id}/documents/{doc}/review` (accepted / rejected / clarification_needed; a reason is now required for the latter two) and the audited download endpoint.
- Provisioning = `POST /reviewer/invitations` (super administrator, invitation-only; invitee sets their own password via `/auth/invitations/accept`). No passwords are generated or shown.

## Business & Project Enquiries (Phase 8)
Routes: `/admin/enquiries` (all), `/project`, `/general`, `/overview`, `/:id`. Backed by `/api/v1/admin/enquiries` (list with server filters, detail, PATCH status/priority, assign, follow-ups, attachment download). Statuses: received, in_review, closed. Notes and follow-up tasks both use the follow-ups endpoint. See docs/PROJECT_PROGRESS.md (Phase 8) for verified endpoints, pending backend items and test status.

## Strategic / M&A Enquiries (Phase 9)
Routes: `/admin/strategic-enquiries` (list), `/overview`, `/:id`. Backed by `/api/v1/admin/enquiries?type=strategic` (no strategic-specific admin API exists yet). Statuses: received, in_review, closed. Actions: assign, status/priority, close, notes/discussions/follow-ups, restricted attachment download. Access is enforced by the backend; the UI shows confidentiality indicators and an Access denied state. See docs/PROJECT_PROGRESS.md (Phase 9) for verified endpoints, pending backend items and test status.

## Lead Assignment (Phase 10)
`/admin/lead-assignment`: counts, filterable lists and assign/reassign for Partner Applications, Business, Project and Strategic / M&A enquiries, plus a workload table. Uses only existing verified endpoints (see docs/ARCHITECTURE.md). Supported record types: applications (`/reviewer/applications`) and enquiries of type general, project, strategic. Assignment permissions are enforced by the backend; the staff list needed to choose assignees is super administrator only. Missing backend capabilities (assignment history, workload aggregates, owner filter for applications) and limitations are listed in docs/PROJECT_PROGRESS.md. Manual verification with real role accounts is still required.

## Discussions & Follow-ups (Phase 11)
`/admin/discussions`: counts, per-record threads (internal notes vs partner-facing messages), add internal note/follow-up. `/admin/follow-ups`: due-date grouped follow-ups with overdue/upcoming views, create and complete. Only backend-supported actions are offered (no cancel, reschedule, reassign or notifications); see `docs/PROJECT_PROGRESS.md` for verified endpoints, limitations and manual testing needed.

## Document Management (Phase 12)
`/admin/documents` (Partner Reviewer, Super Administrator). Documents are reached **per application**: application list → `/admin/documents/:appId` (summary, filters, missing categories) → `/admin/documents/:appId/:docId` (metadata, secure preview/download, Accept / Reject / Request replacement with confirmation, application notes). Reuses Phase 5/6 services (`reviewer/applications/*` detail, `documents/{id}/review`, `documents/{id}/download`); no new endpoints. Global document metrics are shown as **unavailable** (no backend endpoint). Enquiry attachments stay on their enquiry; strategic attachments keep Phase 9 restrictions. Downloads use the authenticated API client; blob URLs are revoked on timeout/unmount; inline preview only for PDF/PNG/JPEG.

### Partner Management
Admin Console → All Partners lists backend organizations (`GET /api/v1/admin/organizations`: server-side search, status, pagination; country/date/sort apply to the loaded page) and shows a profile per partner. Super administrators can suspend/reactivate with a reason (`POST .../status`). Applicants and onboarding are not partners; account activation state is not exposed by the backend. See `docs/PROJECT_PROGRESS.md` (Phase 13).

### Partner Accounts (Phase 14)
`/admin/partner-accounts` (Super Administrator) lists **partner organizations** (not accounts) with their provisioning stage, shows account metrics as *unavailable*, and a verified backend-support matrix. `/admin/partner-accounts/:id` (id = organization id) shows linked records, provisioning (reuses the Phase 7 invitation panel) and the organization audit trail. The backend has no partner-account list/detail/status/role endpoints, so none are simulated. See `docs/PROJECT_PROGRESS.md` (Phase 14).

### Communications (Phase 15)
`/admin/communications` (overview; metrics from backend `meta.total` per outbox status), `/admin/communications/delivery` (email outbox by status, retry failed, dispatch eligible), `/admin/communications/templates` (override, preview, revert built-in templates). `/admin/notifications`, `/admin/communications/emails` and `/admin/communications/preferences` are explicit *unavailable* screens: the backend has no notification feed, ad-hoc email send or preferences endpoint, so nothing is simulated. See `docs/PROJECT_PROGRESS.md` (Phase 15).

## Website content (Phase 16)
`/admin/website` (overview), `/pages`, `/pages/new`, `/pages/:id`, `/approval`, `/claims`. Supports the backend's single content resource (article, FAQ, page, resource): drafts, versions, review/approve/publish/unpublish/reopen/archive, one attachment per item, and public claims. Homepage, services, industries, media library, SEO fields, menus and scheduling are not supported by the backend and are shown as unavailable. See docs/PROJECT_PROGRESS.md (Phase 16) for verified endpoints, limitations and manual tests.

## Admin Users & Roles (Phase 17)
`/admin/users` (directory, metrics, invite), `/admin/users/:id` (profile, role change, activate/deactivate, MFA reset, activity) and `/admin/roles` (read-only role overview), Super Administrator only. Backed by `GET|POST /admin/users`, `POST /admin/users/{id}/role|activate|deactivate|mfa-reset` and `GET /admin/audit`. The backend has no permission editing, suspend, profile update, pagination or search for staff, so those are not offered; search/filter/sort/paging run in the browser over the complete list. Passwords are never created or shown (invitation flow). See `docs/PROJECT_PROGRESS.md` Phase 17.

## Reports & Analytics (Phase 18)
`/admin/reports[/applications|enquiries|strategic|partners|communications]`: exact backend counts, charts, drill-down links, server-side CSV export (enquiries; applications for super administrators). Metrics the backend cannot supply are shown as unavailable. See `docs/PROJECT_PROGRESS.md` for definitions and limitations.

## Audit Logs & System Settings (Phase 19)

Super Administrator only (backend-enforced). `/admin/audit-logs` is a read-only view of `GET /admin/audit` with server filters (administrator, module, action, date range); metadata secrets are masked. `/admin/system-settings` lists and edits backend key/value settings (`/admin/settings`, values 1-200 chars) with a review step before saving. Security policy, categories and audit outcome/IP data are not provided by the backend; see `docs/PROJECT_PROGRESS.md` (Phase 19).

## Production build & deployment (Phase 20)

- `npm run build` reads `.env.production` (`VITE_API_BASE_URL=https://coralswift-backend.onrender.com`) and **fails** if the URL is not https. Dev-only values live in `.env.development.local`.
- SPA fallback: `public/_redirects` (Netlify/Cloudflare). On Render Static Sites add a rewrite `/*` -> `/index.html`; on other hosts configure the equivalent.
- The backend CORS allow-list must include the deployed origin. See `docs/PRODUCTION_READINESS_REPORT.md`.

## Phase 21 – PRD acceptance audit

Reports: `docs/ADMIN_CONSOLE_PRD_TRACEABILITY.md`, `docs/ADMIN_CONSOLE_GAP_REPORT.md`, `docs/ADMIN_CONSOLE_ACCEPTANCE_REPORT.md`. New super-admin screen: **Privacy & Governance** (`/admin/governance`). Checks: `npm run typecheck && npm run lint && npm test && npm run build`. Live staff/MFA verification has not been performed.

## Cross-portal integration status
See [docs/CROSS_PORTAL_INTEGRATION_REPORT.md](docs/CROSS_PORTAL_INTEGRATION_REPORT.md) for implemented vs tested vs live-verified status (Phase 36).

## Final acceptance (Phase 37)
`docs/PRD_REQUIREMENT_TRACEABILITY_MATRIX.md`, `docs/BACKEND_DEPENDENCY_REGISTER.md`, `docs/FINAL_PROJECT_ACCEPTANCE_REPORT.md`. Checks: `npm run typecheck && npm run lint && npm test && npm run build`; browser tests: `npm run e2e` (mocked network; set `E2E_*` credentials for a test environment to enable the live tests). This repository holds the Admin Console and Partner Portal only. The status line at the top of this file ("foundation only") is historical; current status is in the acceptance report.
