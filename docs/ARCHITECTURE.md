# Architecture

## Structure

```
src/
  app/            providers (QueryClient, Toaster, API-auth wiring) and the router
  assets/         logo (copied unmodified from the public-site repo; replace with the production master)
  components/
    ui/           shadcn-style primitives: button, input/select/label, card, dialog (modal + drawer), dropdown-menu
    common/       PageHeader, DataTable, Pagination, SearchInput, StatusBadge, StatCard, ChartCard, FilterDropdown, UserAvatar, ConfirmDialog, states, ModulePlaceholder, ErrorBoundary
    forms/        FormField (label/hint/error wiring), DatePicker, FileUpload
    charts/       BarChartCard (Recharts; shows an empty state when no data)
  config/         env, endpoints (registry, currently empty), permissions, navigation, routes
  features/<module>/{pages,services,types,...}   one folder per Admin module
  layouts/        AuthLayout, AdminLayout (+ Sidebar, Breadcrumbs, UserMenu, NotificationPanel)
  services/api/   Axios client, error normalisation
  store/          authStore (Zustand)
  styles/         Tailwind entry + design tokens
```

Reserved by the requested layout but not created yet (add when needed): `services/storage`, `hooks`, `contexts`, `constants`, `utils`, `lib` holds `cn` only.

## Dashboard data

`features/dashboard/` is split into `types/` (OpenAPI-derived interfaces), `services/dashboardService.ts` (Axios calls via the central client), `utils/transform.ts` (pure aggregation), `hooks/useDashboardData.ts` (TanStack Query, one query per endpoint, enabled only if the role may access the related module) and `components/widgets.tsx` + `pages/DashboardPage.tsx` (UI). No mock data. Lists are fetched once (page_size 100) and aggregated client-side; the UI warns when a list may be truncated.

## Routing

`/login`, `/forgot-password`, `/reset-password`, `/unauthorized`, `/session-expired` use `AuthLayout`. Everything under `/admin` sits behind `ProtectedRoute` (session required) then `AdminLayout`. Each module's routes are wrapped in `ModuleRoute` (permission check) and lazy-loaded. Unknown paths render a not-found page. Route table: `src/app/router.tsx`.

## Authentication

Auth is integrated with the real backend (see README, *Authentication*). `services/api/client.ts` is the single Axios client (base URL from `VITE_API_BASE_URL`); it attaches the Bearer token and does a single-flight refresh + retry on 401. `features/auth/services/authService.ts` owns login, MFA, `/me`, refresh, logout and password reset. `store/authStore.ts` holds user + tokens **in memory only** and the pending MFA step. `ProtectedRoute` redirects to `/login` keeping the destination; `ModuleRoute`/`PermissionGuard` gate by role (`config/permissions.ts`, UX only). Change-password has no backend endpoint yet.

## Permissions

`config/permissions.ts` maps the four PRD roles to module keys; `config/navigation.ts` tags each nav item with a module key. The sidebar hides unauthorized items; `ModuleRoute` blocks direct URL access; `PermissionGuard` gates inline UI. **This is UX gating, not security.** The mapping is derived from the PRD role table plus least privilege (e.g. Strategic/M&A is Super Administrator only) and needs business confirmation. The backend must enforce authorization on every request.

## API integration

All HTTP goes through `services/api/client.ts` (base URL from env, Bearer header and 401 handling via a registered getter/handler to avoid import cycles). Feature services call `requireEndpoint(...)`, which throws `NotConfiguredError` for undocumented endpoints, so nothing silently falls back to mock data. Server state uses TanStack Query; forms use React Hook Form + Zod.

## Module boundaries

A feature owns its pages, services, types and schemas and does not import from other features, except `auth` (session/permission hooks) and `layouts` consuming `auth`. Shared UI lives in `components/`.

## Partner Applications (Phase 5)

`features/partner-applications/`: `services/` (all `/reviewer/applications*` calls through the shared Axios client; endpoints in `config/endpoints.ts` as `reviewEndpoints`), `hooks/useApplications.ts` (queries + `useAppMutation`, which toasts the backend message and invalidates the `['applications']` cache), `schemas/` (Zod), `components/ReviewActions.tsx` (assign, note, information request, stage change, document review dialogs), `utils/format.ts` (labels, status tones, pagination inference). Role gating is UX only (`applicationReviews` module; assignment super-admin only); the backend authorizes each call.

## Application Review (Phase 6)

`features/application-review/`: `pages/ApplicationReviewsPage` (queue, reuses `useApplicationList`) and `pages/ApplicationReviewWorkspacePage` (tabbed workspace), `utils/derive.ts` (read-only checklist and decision derivation from `ReviewDetail`). All API calls, hooks, schemas and dialogs live in `features/partner-applications/` and are reused. Flow: Application -> Review -> Decision (`transition`) -> Approved Applicant -> Onboarding -> Partner account provisioning (separate backend process; never triggered from review). Role gating is UX only (`applicationReviews`); the backend authorizes each call.

## Partner Onboarding (Phase 7)
`features/onboarding/` holds pages (listing, dashboard, workspace), `components/` (ProgressTracker, ProvisioningPanel), `services/` (list approved = two status-filtered reviewer list calls; `invitePartner`), `hooks/`, `schemas/` (Zod invite form) and `utils/derive` (document summary, provisioning blockers). It deliberately imports Phase 5/6 services, hooks, `Documents`/`Section`/`Fields` and `ReviewActions` rather than duplicating them; TanStack Query keys share the `['applications', ...]` prefix so every mutation refreshes all views. Account state is never cached or persisted client-side.

## Business Enquiries (Phase 8)
`features/business-enquiries`: `services` (Axios, endpoints from `enquiryEndpoints`), `hooks/useEnquiries` (TanStack Query + `useEnquiryMutation` that toasts and invalidates `enquiries`/`dash`), `schemas` (Zod follow-up form), `components` (badges, `EnquiryActions` dialogs built on Phase 5 `FormDialog`), `pages` (overview, list, detail). IT/Non-IT is derived in `utils/format.ts` from `details.project_category` per the PRD; untyped backend objects (contact, company, details, documents) are rendered generically.

## Strategic / M&A Enquiries (Phase 9)
`features/strategic-enquiries` is a thin layer over Phase 8: strategic enquiries are `type=strategic` rows of `/api/v1/admin/enquiries` (the backend has no separate strategic admin API). The list is `EnquiriesPage scope="strategic"`; the detail workspace, overview, `ConfidentialBanner` and `utils/strategic` (counts, field ordering) are new. Services, hooks (`['enquiries', ...]` keys), Zod schemas and `EnquiryActions` (with `module="strategicEnquiries"`) are reused. Gating is the `strategicEnquiries` module (UX only); the backend authorizes, and 403 renders an Access denied state.

## Lead Assignment (Phase 10)
`features/lead-assignment` is an adapter, not a new API layer. `leadAssignmentService` calls the existing `partnerApplicationsService.list` (`/reviewer/applications`) and `businessEnquiriesService.list` (`/admin/enquiries?type=`) and normalizes rows to `AssignRecord` (`utils/assignment.ts`). Categories stay separate (key = `category:id`); Strategic is shown only with the `strategicEnquiries` module and the Phase 9 confidential banner. Assignment reuses `AssignDialog` from `ReviewActions` (POST `/reviewer/applications/{id}/assign {reviewer_id}`) and `EnquiryActions` (POST `/admin/enquiries/{id}/assign {user_id|null}`), both now with reassign confirmation via `checkAssignment`. Query keys are prefixed `applications`/`enquiries` so existing mutations refresh the dashboard. Authorization is the backend's; UI gating is a hint and 403s render an access-denied state.
Verified endpoints used: GET `/reviewer/applications`, GET `/admin/enquiries`, GET `/admin/users?role=`, the two assign POSTs above.

## Discussions & Follow-ups (Phase 11)
No new API client code: `features/follow-ups` holds pure helpers (`followUpState`, `groupByDay`, `inDayRange`, `hideRestricted`, `recordPath`), an exact-count metrics service built on the Phase 5/8 list services, the shared `FollowUpList` (confirm-to-complete) and the Follow-ups page. `features/discussions` holds the page and enquiry/application thread panels. Enquiries and applications stay separate resources; follow-ups exist only under `/admin/enquiries/{id}`. Metrics query keys start with `enquiries` so existing mutations refresh them.

## Document Management (Phase 12)
`features/document-management`: `utils/documents.ts` (pure row mapping, summary, filters, review payload validation, access-error mapping, object-URL tracker), `hooks/useDocuments.ts` (`useSecureDocument`), three pages (dashboard, application documents, workspace). Data comes from the Phase 5/6 `partnerApplicationsService` (single source; no duplicate document API). The old stub service was deleted. Document identity is always `(applicationId, documentId)`; there is no cross-application document list.

## Partner Management (Phase 13)
`/admin/partners` (metrics + directory) and `/admin/partners/:id` (profile tabs). Partner = backend organization (`/admin/organizations*`); statuses `active`/`suspended` only; suspend/reactivate with reason (super administrator). Applications, onboarding and account activation remain separate record types and link to their own Phase 5–12 screens. Unsupported items (edit, activity history, categories, performance, account state) are documented as backend dependencies in `PROJECT_PROGRESS.md`.

## Partner Accounts (Phase 14)
`features/partner-accounts`: `utils/accounts.ts` (capability matrix, `inOnboarding`, audit-row mapping that drops `meta`), a one-call `services` (`GET /admin/audit?organization_id=`), `hooks/useAccounts.ts`, and two pages. Everything else is reused: Phase 13 `usePartnerList`/`usePartnerDetail`, Phase 5 `useApplicationDetail`, Phase 7 `ProvisioningPanel` (the only provisioning path: `POST /reviewer/invitations`). The route id is the **organization** id because no account id exists. The old placeholder service/types were replaced.

## Communications (Phase 15)
`features/communication/{types,utils,services,hooks,pages}`. Endpoints live in `communicationEndpoints` (`config/endpoints.ts`). Outbox rows are untyped dicts, so `utils/communication.ts#toDelivery` whitelists fields (bodies/payloads dropped) and redacts rows that look strategic unless the role has `strategicEnquiries`. Template payloads are validated with zod (`templateSchema`, backend limits); placeholders are validated by the backend only. The old `features/notifications` placeholder feature was removed; `/admin/notification-templates` redirects to `/admin/communications/templates`. The header `NotificationPanel` is unchanged (still a shell: no feed API).

## Website Content Management (Phase 16)
`features/content-management/{types,utils,services,hooks,components,pages}`. Endpoints in `contentEndpoints` (`config/endpoints.ts`). `utils/content.ts` holds zod schemas (limits copied from OpenAPI), status/label maps, `toForm/toInput/toPatch` transformations, `isDirty`, the status->actions workflow table (`actionsFor`, super-administrator-only approve/reject) and the backend capability matrix. The editor is a single reusable page (create + edit); non-draft items are read-only. Totals use `meta.total` of 1-row queries. Unsupported areas (homepage, services, industries, media, SEO, menus, scheduling) are explicit "not available" pages, never simulated. Nothing is persisted client-side.

## Admin Users & Roles (Phase 17)
`features/user-management` (`services` -> `hooks/useUsers` (TanStack Query key `['staff', …]`, mutations invalidate it) -> `pages`; pure logic in `utils/users.ts`, zod in `schemas`). Endpoints in `userEndpoints`. Audit history reuses `partner-accounts` audit mapper. `features/roles-permissions/RolesPage` reads the same staff list for member counts. Role/lockout checks in the UI are UX hints; the backend authorises every request.

## Reports & Analytics (Phase 18)
`features/reports`: `services/reportsService.ts` (count-by-`meta.total`, paged row fetch, CSV blob download; reuses existing enquiry/application/partner/communication/dashboard services), `utils/range.ts` (presets, validation, local-day ISO bounds), `utils/aggregate.ts` (day bucketing, grouping, `fetchAll` with a `partial` flag), `hooks/useReports.ts` (TanStack Query, per-metric failure isolation via `settleMetrics`), `components/ReportCharts.tsx` (Recharts cards) and `components/Sections.tsx`. Filters live in the URL (zod-parsed). Rule: totals only from backend counts; rows only for distributions and flagged when partial.

## Audit Logs & System Settings (Phase 19)

- `features/audit-logs`: `auditLogsService` (GET-only on `accountEndpoints.audit`, shared with Phases 14/17) -> `utils/audit.ts` (`toEntry` redacts secret-keyed metadata and withholds strategic rows without `strategicEnquiries`) -> `hooks/useAudit.ts` -> pages. Detail receives the sanitised entry via router state (no get-by-id endpoint).
- `features/settings`: `settingsService` (`settingsEndpoints`) -> `utils/settings.ts` (`normalizeSettings` tolerant of the untyped response, masks credential-like keys) -> `useSettings`/`useSettingMutation` (invalidates `['settings']` and `['audit']`) -> `SettingsPage` (RHF + Zod, review-then-confirm), `SecuritySettingsPage` (unavailable notice).
- Routes: `/admin/audit-logs[/:id]`, `/admin/system-settings[/security]`; `/admin/settings` redirects. Guards: `auditLogs`, `settings` modules (Super Administrator; backend authoritative).

## Build & routing guarantees (Phase 20)

`src/app/router.test.tsx` fails if a sidebar item has no real route, if unknown paths do not hit the 404 route, or if the guards stop redirecting unauthenticated / non-super-admin users away from strategic routes. `vite.config.ts` refuses a production build without an https `VITE_API_BASE_URL`. Env files: `.env` / `.env.production` (public values) and `.env.development.local` (dev proxy, git-ignored).

## Privacy & Governance (Phase 21)

`features/governance` (`service.ts`, `pages/GovernancePage.tsx`), module key `governance` (super administrator only via `ROLE_MODULES`), endpoints in `governanceEndpoints`. Privacy requests, profile-change decisions and launch-readiness use the verified `/admin/privacy-requests*`, `/admin/profile-change-requests*`, `/admin/launch-readiness`. Strategic rows are additionally dropped client-side for roles lacking `strategicEnquiries` (enquiry list, detail, dashboard); this is a UI safeguard, not authorization.


> **Phase 37:** live backend is now 134 paths; staff `POST /auth/change-password` is wired (`config/endpoints.ts`, `authService.changePassword`). See `BACKEND_DEPENDENCY_REGISTER.md` Part C for other newly available endpoints not yet consumed.
