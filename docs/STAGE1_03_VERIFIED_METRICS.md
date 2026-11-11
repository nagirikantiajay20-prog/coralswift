# Stage 1 Audit 03 – Verification of the Reported Numbers

Audit date: 2026-11-11 · **Audit only.** Every command below was read-only with respect to the repository (logs and a scratch build went to the OS temp directory; `dist/` was not touched).

Verdict key: **CONFIRMED** (I reproduced it) · **CONSISTENT** (the figure is internally consistent and my spot-checks agree, but I did not reproduce it item by item) · **NOT RE-RUN** · **CONTRADICTED**.

## 1. Quality gates

| Claim | What I ran | Result | Verdict |
|---|---|---|---|
| Typecheck clean | `npm run typecheck` (`tsc -b`) | exit 0 | **CONFIRMED** |
| Lint clean | `npm run lint` (`eslint .`) | exit 0 | **CONFIRMED** |
| 378 unit tests pass | `npm test` (`vitest run`) | **62 files, 378 tests passed**, 44 s. The API client is mocked, so this is not backend evidence | **CONFIRMED** |
| Production build passes | `tsc -b` (above) + `vite build --outDir <temp>` | exit 0, built in 2.18 s. Warning: main chunk 741.78 kB, `BarChart` chunk 372.72 kB (over the 500 kB advisory limit) | **CONFIRMED** (output not written to `dist/`) |
| Playwright suite | not run | Last recorded in `PRD_REQUIREMENT_TRACEABILITY_MATRIX.md`: "28 passed, 2 skipped (live)" on 2026-11-10 (DOC). Source has changed since; `e2e/portals.e2e.ts` is the only spec file | **NOT RE-RUN** (stale) |

## 2. API coverage – "159 of 183 operations"

| Item | Result | Verdict |
|---|---|---|
| Operations in the OpenAPI document | Saved spec `.tmp/openapi_live.json` (file dated 2026-11-11 11:00): **162 paths, 183 operations** (RUN count). I did **not** re-fetch the live spec, so the live backend may have changed since | **CONFIRMED** for that file |
| Categories | 183 − 18 intentionally unused (17 public-website endpoints + 1 partner endpoint) − 4 not applicable (3 health + `/meta`) = **161 console-relevant**; 159 integrated + 2 unused = 161 | Arithmetic **CONSISTENT** |
| The 159 integrated | My automated matcher (resolves endpoint tables, import aliases and nested keys) matched **129** operations by path and confirmed the HTTP method at a direct call site for 120. The remaining console-relevant operations were traced by hand **by family**: auth via `const e = endpoints.auth` in `authService.ts`; reports via a templated path in `BackendReports.tsx` and literals in `reportsService.ts`; documents via `BASE` in `DocumentQueue.tsx`; staff feed in the communication service; reviewer document-requests in `DocumentRequests.tsx`; audit detail and account detail in their services | **CONSISTENT, not independently proven per operation** |
| The 2 "present but unused" | `GET /partner/applications/{id}` and `GET /partner/documents/{id}` have no call site | **CONFIRMED** |
| Also unreferenced | `GET /partner/document-requests/{id}` (appears to be the "18th" intentionally unused item) | Matches arithmetic; the existing docs describe the 18th loosely as "one partner detail endpoint" |

Method note: my first two scripts produced wrong totals (13, then 129) because they did not follow import aliases, nested endpoint objects, or the two different exports named `partnerEndpoints`. I discarded the first result and corrected the script. The 129/120 figures are therefore a *lower bound*, not a competing count.

## 3. Feature counts – "115 features; 101 / 4 / 10"

| Item | Result | Verdict |
|---|---|---|
| Rows in `FRONTEND_FEATURE_COVERAGE_MATRIX.md` | **115** (Admin 84, Partner 31) | **CONFIRMED** (RUN: recounted the table) |
| Classification | **101 Fully Dynamic, 4 Partially Dynamic, 10 Backend Blocked**; Admin 76 / 4 / 4, Partner 25 / 0 / 6 | **CONFIRMED** as what the table says |
| What this does *not* show | That each row is true. I recounted the table and read its blocked/partial row names; I did not re-trace each of the 115 features through UI → hook → service → HTTP | Limit of the check |
| The 4 partial | Role-based module gating; Discussions metrics and list; Onboarding overview (document counts); Role overview | Named from the table |
| Staleness inside the matrix | The table row for role gating still reads "`GET /auth/permissions` (unused)", but the same file's remediation section and `authService.loadPermissions` say it is now consumed with the static map as fallback | Row text is stale; the count is unaffected |

## 4. Contradictory figures found in the existing docs

| File | Says | Versus |
|---|---|---|
| `DYNAMIC_FUNCTIONALITY_AND_API_AUDIT.md` §1 | 91 fully dynamic / 10 partial / 4 not implemented / 10 blocked; 150 integrated operations; 328 tests | Same file, later section: 101 fully dynamic / 4 partial / 0 not implemented / 10 blocked; 159 operations; 378 tests. §1 was never updated |
| `PRD_REQUIREMENT_TRACEABILITY_MATRIX.md` header | 134 paths, 287 tests, "Phase 37" | 162 paths, 378 tests now |
| `ADMIN_CONSOLE_ACCEPTANCE_REPORT.md` | 162 tests in 27 files | 62 files / 378 tests |
| `BACKEND_DEPENDENCY_REGISTER.md` line 3 | 134 paths | Its own line 50: 162 paths / 183 operations |
| `CROSS_PORTAL_INTEGRATION_REPORT.md` §4 | "115 paths" | 162 |
| `.tmp/live_now.json` | 134 paths / 150 operations (RUN) | `.tmp/openapi_live.json`: 162 / 183 |

Stale text in source (comments, not behaviour): `partner/pages/PartnerPerformancePage.tsx` ("115 paths"); `config/permissions.ts` header ("no permission matrix endpoint … every mapping PENDING"); `config/endpoints.ts` comments such as "The backend has NO partner-account list/detail/status…" above endpoints that now exist.

## 5. What is not verified at all

| Area | Status |
|---|---|
| Authenticated calls against the real backend | **0 operations.** Only unauthenticated probes are recorded in the docs (health 200, protected routes 401) |
| Cross-portal workflow (public form → admin review → partner response → decision) | **Not runtime verified.** The public website is not in this repository |
| Backend enforcement of roles, strategic restriction, file limits, audit logging, retention | Not verifiable from the frontend |
