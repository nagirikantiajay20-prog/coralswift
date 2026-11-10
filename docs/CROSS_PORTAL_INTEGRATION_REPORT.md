# Cross-Portal Integration Report – Phase 36 (2026-11-10)

Legend: **Implemented** = code exists · **Tested** = automated tests (mocked API) pass · **Live-verified** = exercised against `https://coralswift-backend.onrender.com` with real credentials. Nothing below is marked live-verified unless stated.

## 1. Scope reality check
- This repository contains **two** of the three platforms: the **Admin Console** (`/admin/*`, `src/features`) and the **Partner Portal** (`/partner/*`, `src/partner`), one Vite SPA, one Axios client (`src/services/api/client.ts`), one auth store (in-memory tokens).
- **The Public Website is not in this repository.** Its source, forms and uploads could not be audited. Only its backend endpoints were probed (§4).
- Admin and Partner share `/auth/*`; the session type decides the portal (`authService.loadSession` accepts only `staff`, `partnerAuthService.loadSession` only `partner` + organization; the other signs out).

## 2. Validation run (actual scripts)
| Command | Result |
|---|---|
| `npx tsc -b` (`npm run typecheck`) | clean |
| `npx eslint .` (`npm run lint`) | clean after fix (was 3 errors in stale `.tmp/fix.cjs`) |
| `npx vitest run` (`npm test`) | 41 files / 283 tests passed |
| `npm run build` | succeeds; only the >500 kB chunk warning remains (index 720 kB, recharts 373 kB) |
| `npm audit --omit=dev` | 0 vulnerabilities |
| E2E / browser tests | **none exist; not run** (no Playwright/Cypress in the project) |

## 3. Changes made this phase
1. `eslint.config.js`: ignore `.tmp` (scratch scripts broke `npm run lint`).
2. `src/partner/routes.tsx`: forgot/reset pages imported statically (they were already in the main bundle via the admin router; the dynamic import was ineffective and warned on every build). No behaviour change.

No backend contract, status or workflow was changed. No new product features were added.

## 4. API integration (verified against live `/openapi.json`, 115 paths)
- Every `/api/v1/...` path in the endpoint registries (`src/config/endpoints.ts`, `src/partner/config/endpoints.ts`) resolves to a path in the live spec. Single Axios instance, base URL only from `VITE_API_BASE_URL`, single-flight refresh, no second client.
- Live probes (no credentials, read-only): `/health` 200; all tested `/admin/*`, `/reviewer/*`, `/partner/*` and `/auth/me` return **401** without a token; `/content` public 200; `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` present.
- **Public form endpoints (`/enquiries/contact|project|partner|strategic`) return 403 `BOT_CHECK_FAILED` without an `X-Bot-Token`.** The Public Website must supply this token; it cannot be tested from here. Admin/Partner do not call these endpoints.
- **CORS preflight from `http://localhost:5173` to `/auth/login` returns 400** (allowed headers include `X-Bot-Token`, `Idempotency-Key`). The deployed frontend origin must be allow-listed (BACKEND_GAPS X9) or the SPA cannot call the API from a browser. Not verified for the production origin (unknown to me).

## 5. Authentication & authorization
| Check | Status |
|---|---|
| Staff vs partner session separation, mutual exclusion in store | Implemented, Tested |
| Partner on admin routes / staff on partner routes denied (UI) | Implemented, Tested (guards) |
| Per-module staff permissions (UI) | Implemented, Tested (`permissions.test.ts`, router tests) |
| Backend enforcement without token | **Live-verified (401)** |
| Backend role matrix (403 per staff role), partner→admin 403 | Not verified (no credentials) |
| Cross-partner isolation | Design: org derived from token, no org id sent. **Not live-verified** (needs 2 partner accounts) |
| Tokens | In memory only; reload signs out by design; no web storage use found; no `dangerouslySetInnerHTML` |
| MFA, password reset, session expiry | Implemented, Tested (mocked); not live |

## 6. Workflows
| Workflow | Status |
|---|---|
| A. Application → decision → onboarding → provisioning → activation → login | Admin + Partner sides implemented and tested separately; real statuses only (`rejected`/`pilot_onboarding`/`scale_up`, no `approved`); provisioning only via `POST /reviewer/invitations`. **Not live-verified end to end**; Public submission step not auditable here. |
| B. Documents | Partner upload/replace/download and admin review implemented. No document-request status/deadline in backend; no malware scanning (BACKEND_GAPS). Not live. |
| C. Communication | Partner sees partner-visible messages + email notifications, replies via `RespondIn`; internal notes not in `PartnerMessageOut`. No read state, no in-app feed (backend). Not live. |
| D. Enquiry/lead | Admin list/assign/status/follow-ups implemented; public intake needs bot token (§4). Partner-visible sharing: only `GET /partner/enquiries`. Not live. |
| E. Strategic/M&A | Admin guard tests exist (`StrategicGuard.test.tsx`); no partner route touches strategic data. Backend restriction not live-verified. |
| F. Projects/engagements | **Blocked by backend**: no partner project/engagement endpoints; page shows honest unavailable state. |

## 7. Module status (Partner Portal)
Implemented+tested (mocked): auth, activation, dashboard, company profile, documents, application tracking, onboarding (read-only/derived), messages, notifications (email rows only), follow-ups (information requests only), settings/security/privacy. **Backend-blocked (unavailable-state page only):** projects, performance, meetings, team, discussions (redirects to messages). Admin Console: all 22 listed modules have routes; limitations are documented in `ADMIN_CONSOLE_GAP_REPORT.md` / `BACKEND_GAPS.md` (e.g. no partner-account list endpoint, CMS homepage/media unavailable).

## 8. Security findings
- No secrets in frontend; only `VITE_API_BASE_URL`. Dependencies: 0 known vulnerabilities.
- Open (backend): no malware scanning on uploads; rate limiting/lockout behaviour unverified; bot-check is the only observed public-form protection.
- Open (frontend): none found that are verifiable without credentials. Full XSS review limited to grep for HTML sinks (none) and React text rendering.

## 9. Responsive / accessibility / performance
- **Not verified in a browser this phase** (no authenticated session available; no automated a11y/E2E tooling installed). Treat WCAG 2.2 AA and mobile layouts as *implemented-by-design, unverified*.
- Performance: build is code-split per route; main chunk 720 kB (217 kB gzip) and recharts chunk 373 kB exceed the 500 kB warning. Safe next step: split vendor/recharts via `build.rolldownOptions.output.codeSplitting`. Not done (no measurement of benefit).

## 10. Not executed / could not be verified
Live authenticated flows (staff ×4 roles with MFA, partner account), activation, document upload/download, cross-partner isolation, public form submission (bot token), browser CORS from the production origin, responsive/a11y checks, E2E tests (none exist). **Never modified production data.**

## 11. Outstanding issues
| # | Issue | Platform | Severity | Dep. | Resolution |
|---|---|---|---|---|---|
| 1 | CORS allow-list for deployed origin (X9) | Admin, Partner | High | Backend/Ops | Allow-list origin; re-run preflight |
| 2 | No test accounts → no live verification (X14) | All | High | Ops | Provide staff + 2 partner accounts in a test environment |
| 3 | Public Website source absent; bot-token flow unverified | Public | High | Repo | Add site to audit scope |
| 4 | No browser E2E suite | All | Medium | Frontend | Add Playwright against test environment |
| 5 | Partner projects/meetings/team/performance/discussions endpoints missing | Partner | Medium | Backend | See `BACKEND_GAPS.md` |
| 6 | No upload malware scanning | All | Medium | Backend | Add scanning/quarantine release |
| 7 | Bundle > 500 kB | All | Low | Frontend | Manual chunking |

## 12. Completion assessment
- Public Website: **Not auditable (not in repo)**.
- Admin Console: **Implemented, tested (mocked), not live-verified.**
- Partner Portal: **Partially implemented** (5 modules blocked by backend); implemented parts tested (mocked), not live-verified.
- Workflows A–E: implemented but not fully verified; F: blocked by backend.
- **Not production-ready** until items 1–3 are closed and live workflow verification is done.

## 13. Addendum – Playwright suite (added after this report)
- `npm run e2e` (`playwright.config.ts`, `e2e/portals.e2e.ts`; Chromium, desktop + 375px mobile). 28 passed, 2 skipped (live partner test needs `E2E_PARTNER_EMAIL`/`E2E_PARTNER_PASSWORD` for a **test** account).
- Covers: unauthenticated redirects for admin and partner routes, login forms (labels, no horizontal scroll), rejected login and backend outage show errors, keyboard focus. Login API is mocked in the failure tests; no live workflow is verified.
- Found and fixed: admin login password input had no accessible label (`FormField` put the id on the wrapper div). Now uses `Label` + `id`.
- Still unverified: authenticated flows, cross-partner isolation, a11y audit beyond login, tablet widths, Firefox/WebKit.

## 13. Phase 37 addendum (2026-11-10)
- Re-run today: `tsc` clean, ESLint clean, Vitest **287/287** (42 files), Playwright **28 passed / 2 skipped** (`npm run e2e`, mocked network, desktop + 375 px), build passes, `npm audit --omit=dev` 0.
- Live OpenAPI now has **134 paths** (§4's 115 is out of date). New: change-password, permissions, account management (list/detail/resend/revoke/suspend/reactivate/password-reset), follow-up list/PATCH/cancel, enquiry activity, assignees, documents list, security policy, reviewer transitions, partner notification read/read-all. Wired: change-password (admin + partner), partner notification read-state, partner account directory with resend/revoke/suspend/reactivate actions. See `BACKEND_DEPENDENCY_REGISTER.md` Part C.
- §1/§11 item 3 stands: Public Website not in this repo; `Downloads/coralswift-main (1)` is a different product and non-conformant. §11 item 4 (no E2E) is superseded: a mocked-network E2E suite now exists; live E2E still needs credentials.
- Decision: see `FINAL_PROJECT_ACCEPTANCE_REPORT.md` – not ready for production.
