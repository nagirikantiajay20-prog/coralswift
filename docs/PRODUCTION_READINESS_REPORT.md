# Production Readiness Report – Coral Swift Admin Console

Date: 2026-11-10. **Verdict: frontend code complete for what the backend supports; NOT cleared for production** until the live-backend and deployment checks below are done.

## Status of checks (actually run)

| Check | Result |
| --- | --- |
| TypeScript (`npm run typecheck`) | Pass |
| ESLint (`npm run lint`) | Pass |
| Vitest (`npm test`) | Pass, 159/159 in 25 files |
| Production build (`npm run build`) | Pass; main chunk ~690 kB (219 kB gzip), all routes lazy-loaded |
| Built bundle contains backend URL | Yes (`https://coralswift-backend.onrender.com`), after the env fix |
| `dangerouslySetInnerHTML`/`innerHTML`/`eval`/`console.log`/web-storage use in `src` | None found |
| Live backend, authenticated flows | **Not tested** (no staff credentials/MFA) |
| Browser / responsive visual QA (desktop, tablet, mobile) | **Not tested** this phase |
| End-to-end (Playwright) | **Not tested**; framework not installed, none added |

## Implemented modules (Phases 1–19)

Foundation, layout, auth (login/MFA/refresh/logout), dashboard, partner applications, application review, onboarding/provisioning, business and strategic enquiries, lead assignment, discussions, follow-ups, documents, partners, partner accounts (invitation-based only), communications (outbox, templates), website CMS, admin users/roles, reports (with CSV export), audit logs and system settings. Features the backend lacks are shown as "not available" and never simulated; per-phase details are in `PROJECT_PROGRESS.md`.

## Phase 20 fixes

- Local `.env.local` leaked an empty API URL into production builds → moved to `.env.development.local`; added `.env.production`; build now fails without an https URL.
- Added SPA fallback `public/_redirects`.
- Removed unused dev-fixture session code.
- Added router and guard tests (dead nav links, 404, auth redirect, strategic access).

## Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `.env`, `.env.production` | Public backend URL. Only variable the app reads. |
| `DEV_PROXY_TARGET` | `.env.development.local` | Dev-only Vite proxy; never bundled. |

No secrets belong in `VITE_` variables.

## Run, build, test

```bash
npm install
npm run dev        # needs .env.development.local (see README)
npm run typecheck && npm run lint && npm test
npm run build      # outputs dist/
```

## Deployment requirements (backend/ops, unverified)

- Add the deployed frontend origin to the backend CORS allow-list (localhost and coralswift.com were rejected on preflight in Phase 3).
- Host must rewrite unknown paths to `/index.html` (`_redirects` provided for Netlify/Cloudflare; configure Render/other hosts manually).
- Serve over HTTPS; consider CSP and security headers at the host.

## Known limitations / missing backend dependencies

- Sessions are memory-only; a reload signs the user out (backend returns opaque tokens in the body, no HttpOnly cookie).
- Many lists lack server search, sort, totals or date filters; the UI labels client-side refinement of the loaded page. Several metrics need `meta.total`, whose presence is unverified.
- No backend support for: notification feed, ad-hoc email, partner account management, SEO/media/homepage CMS, audit export, security policy settings, permission matrix, assignment history. Full list per phase in `PROJECT_PROGRESS.md`.
- Partner onboarding (Phase 29) has no backend support, so the Partner Portal onboarding page is a read-only view derived from application status/history. Needed from the backend: (1) onboarding record with reference, status/stage list, initiation, update and completion timestamps; (2) partner-visible checklist/task API (name, description, status, required action, due and completion dates, linked document category); (3) onboarding-specific history and messages linked to a task; (4) partner-visible provisioning/activation dates and operational status; (5) request due dates, request status enum and request-to-document linking; (6) documented partner permissions. Details: `PARTNER_PORTAL_ARCHITECTURE.md` Phase 29.
- Role→module mapping is a frontend navigation hint, not authorization.
- Bundle: main chunk exceeds 500 kB (warning only); further vendor splitting is optional.

## Security considerations

Tokens in memory only; Bearer auth via a single Axios client with single-flight refresh; 401 handling expires the session. Strategic/M&A: hidden in navigation, routes, reports, outbox and audit views for roles lacking access (verified by unit tests for route guards); backend authorization remains the real control and is **unverified live**. Credential-like settings and audit metadata are redacted; documents are fetched as authenticated blobs and never persisted. User content is rendered as text.

## Remaining manual verification

1. Log in as each of the four staff roles (with MFA); check navigation, 403 states and every list/detail against real payloads.
2. Confirm strategic enquiries are denied by the backend for non-super roles across lists, details, reports, CSV, documents, notifications and audit.
3. Exercise assign, status change, follow-up create/complete, document review/download, provisioning, CMS workflow, settings change on test data only.
4. Check CORS from the deployed origin, SPA refresh on nested routes, and browser console errors.
5. Responsive pass at ~1280, 768 and 375 px; accessibility spot checks.
