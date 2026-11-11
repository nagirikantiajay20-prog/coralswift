# Stage 1 Audit 04 – Remaining Gaps, Risks and Decisions Needed

Audit date: 2026-11-11 · **Audit only.** Ranked by how much each item changes the answer to "is the portal PRD-complete and safe to rely on?". Evidence tags as in `STAGE1_01`.

## 1. Nothing has been verified against a real, authenticated backend  (highest impact)

- **0 authenticated operations are runtime-verified** (existing docs; consistent with what I found). All 378 unit tests mock the API client. The only live evidence on record is unauthenticated: health endpoints 200, protected routes 401.
- Consequently every "Implemented" status in `STAGE1_01` means *code and mocked tests exist*. Role enforcement, strategic-record restriction, token refresh rotation, document download auditing, file limits and the full public → admin → partner workflow are all unproven.
- The existing docs say no credentials were available. **That may no longer be true:** `.env.development.local` (gitignored, not tracked) defines `VITE_DEV_ADMIN_EMAIL`, `VITE_DEV_ADMIN_PASSWORD`, `VITE_DEV_PARTNER_EMAIL` and `VITE_DEV_PARTNER_PASSWORD`. I listed variable names only. I did **not** use these to sign in and did not display any value. I did check, without printing them, that none of the four values appears anywhere in the current `dist/` bundle (0 files), and `src/config/env.ts` gates them on `import.meta.env.DEV`.
- **Decision for you:** whether to allow authenticated runtime testing, and against which backend. The only backend named anywhere is `https://coralswift-backend.onrender.com`; nothing I read says whether that is production or staging. Several actions (invite a partner, transition an application, upload, publish content, run a privacy "execute") change real data, so I will not run them without your say-so and a clear target.

## 2. The audited code is mostly uncommitted

| Fact (RUN: `git status`, `git rev-list`) | Value |
|---|---|
| Commits in the repository | 2 (latest 2026-11-10) |
| Tracked files modified | **107** |
| Untracked, non-test source files under `src/` | **15** (e.g. `partner/components/StartApplication.tsx`, `partner/pages/PartnerEnquiriesPage.tsx`, `features/auth/components/StaffSecurity.tsx`, `features/auth/components/ProfileEditor.tsx`, `features/follow-ups/components/AllFollowUps.tsx`, `services/api/csv.ts`, `store/tabOwner.ts`) |
| Untracked test files under `src/` | 20 |
| Other untracked | 7 docs, `render.yaml`, `scripts/` |

Features that the status tables call "Fully Dynamic" (partner application creation, partner enquiries, staff sessions, follow-up editing) exist **only in the working tree**. If this folder is lost, they are lost, and no commit reproduces what was audited. I did not commit anything (instruction). This is a decision for you.

## 3. Genuine PRD gaps (from `STAGE1_01`)

| ID | Gap | What closes it |
|---|---|---|
| P-16 | No file-size restriction visible to the user (`documentFiles.ts`: "No size limit is documented") | Ask the backend owner for the limit; add the pre-check and message |
| P-18 / A-22 | Retention and secure deletion not demonstrable. Partner delete is soft; privacy "execute" is described as anonymising contact data | Decide the retention schedule (PRD §25 lists it as an open decision); confirm what the backend physically deletes |
| A-10 | "Communication history" is only email-delivery status, an enquiry activity timeline, and application messages | Decide what "history" must contain; a backend resource may be needed |
| A-19 | The 3-year / 50-person / INR 2 crore thresholds (§28) are not displayed in the console | Confirm whether they belong in the console or only on the public site; `GET /catalog/partner-criteria` exists |
| P-04 | No idle timeout; session expiry relies on token lifetime | Decide a policy; token lifetime is a backend setting |
| P-17 | No malware scanner (uploads are "quarantined") | PRD says "where available"; record the decision |

## 4. Security observations (read from code; not penetration tested)

- **Token storage.** The refresh token is kept in per-tab `sessionStorage` (`store/authStore.ts`); `tabOwner.ts` guards against duplicated tabs reusing the one-time token. PRD §19 says "secure cookie/session settings". The design uses bearer tokens rather than cookies, so it is JavaScript-readable if XSS ever occurs. This is a design trade-off worth recording, not a defect I can demonstrate.
- **Role checks in the browser are hints.** `config/permissions.ts` states this itself. Safety depends entirely on backend enforcement (unverified, see §1).
- **CSV safety.** `csv.ts` does no sanitising; formula-injection protection is a backend claim.
- **Positive checks:** no payment / e-signature / CRM / scoring code; eligibility outcomes are entered by a human; dev-login values are dev-only and absent from the build; `.env`, `.env.*` (except `.env.example`) and `.tmp` are git-ignored; no env file other than `.env.example` is tracked.
- **Not reviewed:** `render.yaml` (untracked) and `docs/SECURITY_HEADERS.md`, so I make no claim about security headers or CORS. The docs list the localhost CORS preflight (400) as an open item (BDR-O01).
- **Bundle size:** main chunk 741.78 kB, one chart chunk 372.72 kB (Vite warns above 500 kB). A performance matter against PRD §16, not a defect.

## 5. PRD-document issues

- Cover says "Version 2.0"; addendum footers say "Version 3.0". Confirm which governs.
- §25 lists **open decisions that affect the access model**: who owns the confidential strategic queue, and whether the 3-year / 50-personnel / INR 2 crore criteria apply per pathway. Until answered, "least privilege for strategic enquiries" cannot be signed off.
- The public website (PRD §6–§12 and the five enquiry forms) is **not in this repository**, so the end-to-end journeys in §11 and §29 "Forms" cannot be accepted from here.

## 6. Documentation reliability

The existing `docs/` set (19 files before this audit) contains contradicting figures (see `STAGE1_03` §4), including a headline summary that was never updated after later passes. Treat any single number from those files as unverified until it matches `STAGE1_03`.
