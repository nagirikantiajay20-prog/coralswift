# Vercel Admin and Partner deployment report

Frontend: https://coralswift-three.vercel.app. Backend: https://coralswift-backend.onrender.com/api/v1. Date: 2026-11-12. Nothing was committed, pushed or deployed.

## 1. Summary
Inspection showed the single-login, role-redirect, MFA, refresh, guards and partner isolation work already existed (commit 445aaaa). This pass closed the remaining gaps listed below. No credentials were available, so no authenticated live test was run.

## 2. Files modified / added
- `vercel.json` (new): SPA rewrite and security headers (CSP `connect-src` limited to the backend origin).
- `src/app/router.tsx`: `/applications` (backend notification link) and `/activate` (invitation link) redirects that keep the query string.
- `src/features/partner-applications/pages/ApplicationsPage.tsx`: search box is pre-filled from `?reference=`.
- `src/features/audit-logs/utils/audit.ts`, `src/features/communication/utils/communication.ts`: strategic regexes removed, `is_strategic` only.
- Three tests updated to set `is_strategic`.

## 3. Vercel configuration
Set `VITE_API_BASE_URL=https://coralswift-backend.onrender.com` in the Vercel project (Production). Do not include `/api/v1`: `src/config/endpoints.ts` adds it. `.env.production` already holds this value. `vercel.json` is the only deployment config needed.

## 4. Backend CORS
Completed and verified (live OPTIONS to `/auth/login`): `https://coralswift-three.vercel.app`, `http://localhost:5173` and `https://coralswift-ochre.vercel.app` each return 200 with `allow-credentials: true` and the exact origin echoed. Not verified: authenticated requests, refresh, uploads and downloads from the deployed origin.

## 5. Production API URL
Implemented, partially verified. `.env.production` and `render.yaml` use the backend URL. The built bundle contains one `http://localhost` string, a library fallback and not an API call. Dev uses a proxy (`.env.development.local`). The deployed browser was not inspected.

## 6-7. Centralized login and role routing
Implemented earlier; unit and router tests pass. Not verified on Vercel with the five test accounts (credentials not supplied).

## 8-9. Admin and Partner integration
- Implemented and tested locally: modules per the earlier PRD traceability docs.
- Fixed now: notification link route, activation link route, `is_strategic` handling.
- Done: CMS media library (`website/media`: list, PNG/JPG upload with client-side type/10 MiB check, authenticated preview, publish/unpublish/archive); typed and built, not exercised against the live backend. Pending: a field-by-field re-check against the 251-path OpenAPI; `scan_status` / `retention_until` display and the upload error codes (413/415) were not re-audited in this pass.
- Unauthenticated visits to `/applications?reference=` go to login and do not return to the link afterwards.

## 10. Shared architecture
No changes were needed. The single API client, auth store and guards are reused by both portals.

## 11. Test results
| Check | Result |
|---|---|
| `tsc -b` | Pass |
| `eslint .` | Pass |
| `vitest run` | Pass, 388/388 (62 files) |
| `npm run build` | Pass (chunk-size warning only) |
| Live CORS preflight | Pass for the three origins |
| Deployed-browser tests, live logins | Not run |

## 12. Backend dependencies
Malware scanner not running; CAPTCHA off; PDF/Excel export, secrets API, cookie sessions, calendar, external email reply: unavailable by owner decision. Per-pathway required documents are undefined. Hard delete is blocked (409 `RETENTION_POLICY_NOT_APPROVED`).

## 13-15. Manual steps and blockers
- Requires Vercel configuration: set `VITE_API_BASE_URL`, deploy, and confirm `vercel.json` is picked up.
- Pending: the five-role live login test on the deployed URL; confirm with the backend team that `/applications?reference=` is correct for partner recipients (the redirect sends partners to their dashboard).
- Blocked by backend: the items in section 12.
