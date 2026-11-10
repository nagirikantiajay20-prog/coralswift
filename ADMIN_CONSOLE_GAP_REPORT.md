# Admin Console – Gap Report (Phase 21)

Companion to `ADMIN_CONSOLE_PRD_TRACEABILITY.md` (IDs below refer to its rows). Date: 2026-11-10. Backend OpenAPI re-fetched and unchanged since Phase 17.

## 1. Frontend gaps closed in Phase 21

| Item | Rows | What changed |
|---|---|---|
| Privacy & Governance module (`/admin/governance`, super admin) | M2, M3, B10, H5 | Backend-supported but previously unused: list/filter privacy requests, start/complete, **execute deletion** (confirmation dialog, success shown only after backend 2xx); approve/reject pending partner profile-change requests; read-only launch-readiness report. |
| Strategic defence-in-depth in general enquiry surfaces | A3, F2, F3 | `/admin/enquiries` no longer offers the "strategic" type filter or shows strategic rows to roles without `strategicEnquiries`; dashboard enquiry metrics exclude strategic rows for those roles; enquiry detail shows "Restricted record" for strategic records. Reuses existing `hideRestricted` / `visibleEnquiryTypes`. This is cosmetic hardening: **backend authorization remains the only real control**. |
| Tests | – | +3 tests (governance rules/render/error, strategic detail guard). |

## 2. Missing (backend contract exists, Admin UI absent)

| Row | Gap | Required action | Priority |
|---|---|---|---|
| E5 | Meeting confirm/decline/cancel: **built** on `type=meeting` enquiries (`EnquiryActions.tsx`); live behaviour and requester notification unverified | Live test | Medium |
| J5 | Own sessions list/revoke, recovery-code rotation | Add to Security page | Medium |
| C5 | Show `/catalog/partner-criteria` as read-only reviewer reference | Small panel | Low |
| – | Newsletter CSV, `/health*` status page | Only if business wants them | Low |

## 3. Backend-blocked (no endpoint; nothing simulated)

Partner-account list/status/invitation state (D5) · exception workflow for criteria (C3) · dedicated strategic queue/owner (F7) · assignment history (G2) · reviewer/assignee picker for non-super roles (B3, G1) · permission matrix API (J2) · authenticated change-password (J6) · notification feed/ad-hoc email/preferences (I4) · CMS scheduling/media/SEO/homepage/page owner fields (K3, K4) · portal adoption & document-turnaround KPIs (L2) · malware scanner (H4) · document retention dates/secure file deletion (H5) · audit search/export/outcome/IP (M1) · server search/sort/totals on several lists (A1, B1, E1, J1, L1) · classification flag on audit/outbox rows so strategic content need not be detected by regex (F4) · typed overview/KPI/settings/launch-readiness/organization-detail schemas.

## 4. Business decisions required (PRD §25 and addendum)

1. Which of 3-year / 50-personnel / INR 2 crore apply to which pathway (C2). 2. Mapping between backend application statuses and the six allocation stages (B7). 3. Whether to enable meeting scheduling / calendar integration (E5, N2). 4. Retention periods and secure-deletion process for documents and strategic records (H5). 5. Named owners for general, project, partner and strategic queues, response targets and escalation (addendum). 6. Hosting, email, CRM, calendar and private-storage providers (N1–N3). 7. Whether malware scanning is required before go-live (H4). 8. Role→module matrix sign-off (J2).

## 5. Prioritised remediation plan

**Critical/High before go-live**
1. Live authenticated test, per role with MFA, of strategic denial across list, detail, search, CSV, documents, outbox, audit, overview/KPIs (F1–F6, A3).
2. Backend: typed totals for overview/KPIs so dashboards/reports are not page-limited (A1, L1).
3. Backend/ops: retention + secure deletion for documents (H5); privacy-request procedure documented (M2).
4. Live MFA login test for all four roles (J3).
5. Backend: strategic classification flag on audit/outbox rows (F4).

**Medium**: meeting actions (E5), sessions/recovery codes (J5), role matrix confirmation (J2), responsive + accessibility QA (O1, O2), status↔stage mapping (B7).

**Low**: criteria panel, health page, typed schemas, code-splitting of the 690 kB main chunk.

## 6. Security and business-rule concerns

- Roles are enforced in the UI by a hint map; if the backend does not scope `/admin/enquiries`, `/admin/overview`, `/reports/kpis` or `/admin/notifications` by role, strategic information could still arrive in responses (UI now drops strategic rows it recognises, but aggregate counts from the backend cannot be filtered client-side).
- Audit/outbox strategic redaction is a regex heuristic.
- "Execute deletion" is irreversible and only anonymises contact data per backend description; legal-retention checks are not performed by the UI.
- Sessions are in-memory only (reload signs out): safe, but no cookie-based session hardening is possible without backend change.
- No excluded functionality (payments, e-signature, marketplace, automated scoring, guaranteed allocation) is implemented; no compliance claim (HIPAA/SOC 2/ISO/PCI) appears in the UI.
