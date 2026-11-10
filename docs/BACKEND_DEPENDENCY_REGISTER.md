# Backend Dependency Register – Phase 37 (2026-11-10)

Basis: live `https://coralswift-backend.onrender.com/openapi.json` re-fetched during this audit (**134 paths**), compared with the Phase 36 snapshot (115 paths) and with `src/config/endpoints.ts`, `src/partner/config/endpoints.ts`. Only gaps confirmed against the live spec or by unauthenticated live probe are listed. Detailed per-module history stays in `BACKEND_GAPS.md` (written before the 19 new paths; its items X5, X8, X11 and several module items are now **stale** – see Part C).

Priority: **P1** blocks a PRD must/critical requirement or is a security exposure · **P2** blocks significant PRD functionality · **P3** limits quality/reporting.

## Part A – Capabilities still missing in the backend

| ID | Missing Capability | Affected Platform | Business Impact | Required Backend Change | Priority |
|---|---|---|---|---|---|
| BDR-B01 | Malware scanning / quarantine of uploads (backend states none configured) | Partner, Admin | PRD §13/§19 require scanning "where available"; partner and financial documents are uploaded unscanned | Add scanner + `scan_status` on documents; block download/review until clean | P1 |
| BDR-B02 | Retention dates and secure (hard) deletion for documents and enquiry data | All | PRD §13/§15H/§19 retention and secure deletion unmet; partner delete is soft delete | `retention_until` field, scheduled purge, auditable hard delete, documented policy | P1 |
| BDR-B03 | Reviewer checklist / criteria results storage, exception records, per-stage owner and notes | Admin | PRD §11/§18/§28 want checklist results, exceptions via approved process, and the six stages tracked with owner/timestamp/notes; currently only generic notes + status history | `Review` entity (checklist items, result, exception reason/approver), stage records; **no automated final scoring** (out of scope) | P2 |
| BDR-B04 | "Additional document request" as a resource (type, due date, status, linked document category) | Partner, Admin | PRD §13 additional document requests; scenario C cannot show due dates or fulfilment state | Request resource linked to application + document category with lifecycle | P2 |
| BDR-B05 | Onboarding record API (stages, partner-visible checklist/tasks, activation dates) | Partner, Admin | Partner onboarding page is a read-only derivation from application status; no checklist or milestone tracking | Onboarding entity + partner-visible task endpoints | P2 |
| BDR-B06 | Partner multi-user / team management and partner roles | Partner | PRD §13 role-based access for partners; team page is an unavailable state | Partner user CRUD, partner role set, permission doc. (`/auth/permissions` exists but returns an untyped dict) | P2 |
| BDR-B07 | **Verified** authorization for strategic/M&A and partner isolation (not a missing feature – unverified control) | Admin, Partner | PRD §14/§19/§28 confidentiality. Frontend hiding is cosmetic; backend is unverified for list, detail, CSV, documents, outbox, audit, KPIs, notifications and cross-partner reads | Provide test accounts (4 staff roles, 2 partners) and a documented role matrix; run 403 matrix; add a strategic classification flag on audit/outbox/notification rows | P1 |
| BDR-B08 | Evidence that document storage is private with signed/authorised access | Backend | PRD §13/§17/§19; frontend only fetches authenticated blobs | Infra attestation: private bucket, signed URLs or authenticated streaming, audit of every download | P1 |
| BDR-B09 | CMS depth: page tree, homepage/hero, services, media library, SEO fields (title/description/canonical/OG), navigation, scheduled publication, page owner/reviewer/last-reviewed | Admin, Public | PRD §14/§28 content governance and §16 SEO cannot be managed from admin | Extend `content` model or add page/media/SEO resources | P2 |
| BDR-B10 | Server-side search, sort, date filters and guaranteed `meta.total` on list endpoints; typed responses for overview/KPIs/settings/notification rows; actor names and `updated_at` | Admin | Lists refine only the loaded page; KPI/report accuracy limited; field names guessed on untyped dicts | Add filters/sort/total; publish typed schemas | P3 |
| BDR-B11 | Partner-side projects/engagements, milestones, free discussion threads, meetings list, performance scorecards | Partner | Scenario G cannot run; PRD §15I scorecards are Phase 4 "Could have" | Define entities after business approves scope (no guaranteed-allocation semantics) | P3 |
| BDR-B12 | Audit export (CSV) and security-policy write | Admin | PRD §14 "Reports, CSV export and audit logs" – only enquiries CSV exists | Add export endpoint with same RBAC as audit | P3 |
| BDR-B13 | Acknowledgement/notification email delivery observability (delivery status, bounce) and authenticated sending domain (SPF/DKIM/DMARC) evidence | Backend/Ops | PRD §11/§17/§21 acknowledgement + deliverability | Provide staging mailbox + delivery-status in `/admin/notifications` | P2 |
| BDR-B14 | Public form protection contract: how the Public Website obtains `X-Bot-Token`; documented rate limits and duplicate handling | Public | All four public form endpoints return 403 `BOT_CHECK_FAILED` without the token (live-verified); site cannot be validated | Document token issuance; confirm limits | P2 |

## Part B – Operations / environment dependencies

| ID | Item | Affected Platform | Business Impact | Required Change | Priority |
|---|---|---|---|---|---|
| BDR-O01 | CORS allow-list for the deployed frontend origin (preflight from `http://localhost:5173` to `/auth/login` returned 400 in Phase 36; allowed headers include `X-Bot-Token`, `Idempotency-Key`) | Admin, Partner | Browsers cannot call the API from an un-allow-listed origin: **portals unusable until fixed** | Add production + staging origins; re-run preflight | P1 |
| BDR-O02 | Test environment and credentials (4 staff roles with MFA, 2 partner accounts, test mailbox) | All | Every end-to-end scenario is unverified live | Provision seeded test tenant | P1 |
| BDR-O03 | Hosting SPA fallback + security headers/CSP for the console host | Admin, Partner | Deep links 404 on hosts without rewrite (`public/_redirects` covers Netlify/Cloudflare only) | Configure host; add CSP | P2 |
| BDR-O04 | HttpOnly-cookie session option / silent refresh | Admin, Partner | Reload signs the user out (tokens in memory by design) | Optional backend change | P3 |

## Part C – Backend capabilities that now exist but the frontend does not use yet (frontend work, not backend gaps)

These were recorded as gaps in earlier phases; the live spec now provides them. They need a verified contract read and UI work, so they are **not** wired in this phase except where noted.

| ID | New live capability | Closes earlier gap | Frontend state | Priority |
|---|---|---|---|---|
| BDR-F00 | `POST /auth/change-password` `{current_password,new_password}` | X11 | **Wired (admin page + Partner Security page)**; unit tests added. Reset-by-email kept as the forgotten-password path | done |
| BDR-F01 | `POST /partner/notifications/{id}/read`, `/read-all`; `PartnerNotificationOut` is now typed (`template`, `delivery_status`, `created_at`, `read_at`, `is_read`) | read state | **Wired** on the Partner Notifications page (unread marker, Mark read, Mark all as read); unit test added | done |
| BDR-F02 | `GET /reviewer/transitions`, `/admin/accounts` (+detail, resend, revoke, suspend, reactivate, password-reset), `/admin/follow-ups` list + PATCH + cancel, `/admin/enquiries/{id}/activity`, `/admin/assignees`, `/auth/permissions`, `/admin/documents`, `/admin/security-policy` | X5, X8, §12 partner account management, §9 follow-ups, §6/§7 activity, §8 assignee lookup, §10 document list | **Partial:** `GET /admin/accounts?user_type=partner` directory plus `POST .../invitation/resend|invitation/revoke|suspend|reactivate` wired on Partner Accounts (state-appropriate buttons, confirmation dialog, 403/429 messages; unit tests). **Not wired:** account detail, admin-initiated `password-reset`, `/reviewer/transitions`, `/admin/follow-ups` PATCH/cancel, enquiry `activity`, `/admin/assignees`, `/auth/permissions` (untyped dicts) | P2 |
| BDR-F03 | `GET /catalog/partner-criteria` (criteria, pathways, submission checklist) | R-008 | Not consumed; could replace any hard-coded criteria text | P3 |
| BDR-F04 | `GET/DELETE /auth/sessions` | session management | Used by the Partner Security page (list/revoke); not offered in the Admin Console | P3 |
| BDR-F05 | – (frontend) split recharts/vendor chunks | bundle >500 kB | Not done (no measurement of benefit) | P4 |
