# Stage 1 Audit 05 – Proposed Cleanup Plan (NOTHING HAS BEEN DONE)

Audit date: 2026-11-11 · This is a **proposal for your approval**. No file in `src/` was changed and nothing was deleted, committed or pushed. Stage 2 should start only after you choose from the decisions below.

Effort is a rough guide (S < 1 h, M ≈ half a day, L > 1 day). Risk describes the chance of breaking something that works.

## A. Needs your decision first

| # | Decision | Options | My recommendation |
|---|---|---|---|
| D1 | **Preserve the work.** 107 modified and 44 untracked files (35 under `src/`) are uncommitted (`STAGE1_04` §2) | Commit to a branch · leave as is | Commit to a branch so the audited state is reproducible. I will not do it unasked |
| D2 | **Authenticated testing.** Dev-login variables exist locally; the target backend is not stated to be staging (`STAGE1_04` §1) | Allow read-only checks only · allow full flows against a named environment · no runtime testing | Read-only first, against an environment you confirm is not production |
| D3 | **Partner menu items** Projects, Performance, Meetings, Team (all "not available" pages) | Hide from navigation, keep routes · remove pages entirely · leave | Hide from navigation. They promise things the PRD excludes (§23) or defers (§15D, §15I) and are not required by §13 |
| D4 | **Admin placeholders** (Email composer, Notification preferences, CMS Homepage / Services / Industries / Media) | Hide · leave | Hide from navigation unless you plan those features; none is a §14 requirement |
| D5 | **PRD ambiguities:** what "communication history" must contain (A-10); where the §28 thresholds belong (A-19); retention and deletion rules (P-18); idle-timeout policy (P-04); file size limit (P-16) | answers from the business owner / backend owner | These cannot be closed by code alone |

## B. Safe cleanups (low risk, no behaviour change)

| # | Item | Files | Effort | Risk |
|---|---|---|---|---|
| C1 | Delete dead scaffold: `PartnerModulePage.tsx` and `partner/config/modules.ts` (each referenced only by the other; not routed) | 2 files | S | Very low. Typecheck and tests would show any miss |
| C2 | Fix stale comments: `PartnerPerformancePage.tsx` ("115 paths"); `config/permissions.ts` header ("no permission matrix endpoint … PENDING"); `config/endpoints.ts` notes claiming no account endpoints | 3 files | S | None (comments only) |
| C3 | Reconcile `docs/`: correct `DYNAMIC_FUNCTIONALITY_AND_API_AUDIT.md` §1 to match its later figures; mark or regenerate `PRD_REQUIREMENT_TRACEABILITY_MATRIX.md` (134 paths / 287 tests / "Phase 37"); fix path counts in `BACKEND_DEPENDENCY_REGISTER.md` and `CROSS_PORTAL_INTEGRATION_REPORT.md` | 4 docs | M | None |
| C4 | Update the feature matrix row for role gating (still says `/auth/permissions` unused) | 1 doc | S | None |

## C. Navigation scope (after D3 / D4)

| # | Item | Effort | Risk |
|---|---|---|---|
| C5 | Remove Projects / Performance / Meetings / Team from `PARTNER_NAVIGATION`; keep or delete the page files per D3 | S | Low. Check `router.test.tsx` and partner page tests that assert the nav |
| C6 | Remove the admin placeholder routes from nav per D4 | S | Low. Same test check |

## D. Real PRD work (needs D5 answers; this is where completion is actually gained)

| # | Item | Depends on | Effort |
|---|---|---|---|
| W1 | File-size pre-check and message in `documentFiles.ts` (P-16) | backend limit | S |
| W2 | Show the thresholds in the application review view, if desired (A-19) | decision on location; `GET /catalog/partner-criteria` | M |
| W3 | Communication history view: combine enquiry activity, application messages and email log per record (A-10) | decision on contents; may need backend support | M–L |
| W4 | Idle-timeout with warning (P-04) | policy | M |
| W5 | Retention/deletion: surface retention info and confirm what "execute" removes (P-18) | backend + policy | M + backend |
| W6 | Optional: split the 741 kB main chunk (route-level or chart-library splitting) | none | M |

## E. Verification work (not cleanup, but needed before sign-off)

| # | Item | Depends on |
|---|---|---|
| V1 | Re-run Playwright (`npm run e2e`) after any Stage 2 change; last recorded run (28 passed, 2 skipped) predates the working-tree changes | nothing |
| V2 | Authenticated runtime pass of the cross-portal workflow and the role matrix | D2 |
| V3 | Trace the remaining 100+ features item by item if you want the 115-feature figure to be more than a recount of the existing table | time |

## F. What I recommend you do first

1. Answer **D1** (preserve the work) – it protects everything else.
2. Answer **D2** – it turns "0% runtime-verified" into something measurable.
3. Approve **C1–C4** (safe, quick).
4. Then **D3/D4**, and send the **D5** questions to the business and backend owners.
