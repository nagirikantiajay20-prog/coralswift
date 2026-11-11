# Stage 1 Audit 02 – Scope Classification (in scope / optional / Phase 4 / out of scope)

Audit date: 2026-11-11 · **Audit only: nothing was changed or removed.**

Basis: PRD §13 and §14 (required), §15 (optional add-ons; §15I = Phase 4), §23 (release priorities and "out of scope unless separately approved"), §28–§29 (acceptance details). Evidence tags are the same as in `STAGE1_01` (CODE = read this session, RUN = executed, DOC = existing repo doc, not re-verified).

## 1. Result in one paragraph

Nothing built in the console implements a capability that §23 puts out of scope. A scan of non-test source for payment, e-signature, marketplace, CRM and automated-scoring terms found **no matches** (RUN; the only hit was "de**sign**ation", a false positive). However, the Partner Portal **navigation advertises five items that §13 does not ask for** (Projects, Performance, Meetings, Team, and arguably Follow-ups). Four are honest "not available" placeholders; none invents data. The scope risk is the *menu*, not the behaviour.

## 2. Partner Portal navigation (15 items, `partner/config/navigation.ts`)

| Nav item | Class | PRD basis | What the page really does (CODE) |
|---|---|---|---|
| Dashboard | In scope | §13 Partner dashboard | Live data |
| Application | In scope | §13 status and reviewer messages | Live data; creation via `StartApplication.tsx` (untracked file) |
| Onboarding | In scope (supports §28 pilot/onboarding stage) | §28, §29 Workflow | **Not read in detail** |
| Company profile | In scope | §13 profile and completion indicator | Live data |
| Documents | In scope | §13 documents and requests | Live data |
| Messages | In scope | §13 reviewer messages | Live data (old `/discussions` URL redirects here) |
| Notifications | In scope | §13 | Live data |
| Enquiries | In scope | §13 enquiry history | Read-only list |
| Profile changes | In scope | §13 update requests and history | Live data |
| Settings (account / security / privacy) | In scope | §13 sign-in, MFA; §19 | Live data |
| **Follow-ups** | In scope in spirit (supports "additional document requests") | §13 | Shows information requests from application tracking (`useApplicationTracking`); not a separate follow-up resource |
| **Projects** | **Out of scope as a feature** (§23 "live project marketplace", "guaranteed project allocation") | §23, §9 | Unavailable state; text says an application "does not mean a project has been assigned". Compliant wording |
| **Performance** | **Phase 4** | §15I "performance scorecards based on agreed, auditable measures"; §23 "automated partner scoring" is out of scope | Unavailable state plus a table of what is *not* offered. No scores shown. Compliant |
| **Meetings** | **Optional add-on** | §15D | Unavailable state (no partner-facing endpoint) |
| **Team** | **Not in the PRD** | not found in §13 | Unavailable state (no partner-facing endpoint) |

Dead code in the same area: `partner/pages/PartnerModulePage.tsx` ("Scaffold only") and `partner/config/modules.ts` are imported by nothing else (RUN: grep). They are not routed.

## 3. Admin Console features outside the §14 list

| Feature | Class | PRD basis | State |
|---|---|---|---|
| Meeting confirm / decline / cancel on enquiries | Optional add-on (present) | §15D | Functional. Confirm requires `calendar_checked`, consistent with "confirmation only after real calendar booking" |
| Content scheduling (`publish_at`) | Optional add-on (present) | §15E "publication dates" | Functional |
| Newsletter CSV export | Optional add-on (present) | §15E newsletter opt-in | Functional, listed under reports |
| Content claims register | In scope | §28 content register, §10 publication control | Functional |
| Launch readiness | In scope | §28, §29 | Functional |
| Privacy requests (execute / resolve) | In scope | §19 | Functional; see P-18 in `STAGE1_01` about what "execute" destroys |
| Partner account directory (resend / revoke / suspend / reactivate / reset) | Supporting | §14 users and access | Functional; not itemised in the PRD |
| Staff notification feed | Supporting | not named in §14 | Functional |
| Discussions page | In scope in name (BDM role: "partnership discussions") | §14 role table | **Partial**: no discussion resource exists in the backend; the page is metrics and a list of enquiries/applications, and "pending responses" is a proxy (applications in `information_requested`) |
| Email composer | **Not in the PRD** | none | Unavailable placeholder (no send endpoint) |
| Notification preferences | **Not in the PRD** | none (§15H cookie preferences is a different thing) | Unavailable placeholder |
| Homepage / Services / Industries / Media library pages | Mostly **not in the PRD**; partly §15E (optional resource centre) | §14 says "website pages, insights" | Unavailable placeholders; the CMS covers article / faq / page / resource |
| Permission matrix / role editing | **Not in the PRD** | §14 fixes four roles | Unavailable; roles overview is read-only and partial |

## 4. Mapping the 10 "Backend Blocked" features to the PRD

Existing matrix: `FRONTEND_FEATURE_COVERAGE_MATRIX.md` (DOC; I recounted its rows to 10 and read their names, RUN).

| Backend-blocked feature | Is it required by §13/§14? |
|---|---|
| Admin email composer | No |
| Admin notification preferences | No |
| Admin CMS Homepage / Services / Industries / Media | Not as such (see §3) |
| Admin permission matrix / role editing | No |
| Partner follow-ups (staff-style) | No (information requests are covered elsewhere) |
| Partner projects and engagements | No (§23 excludes the marketplace) |
| Partner performance scorecards | No (Phase 4) |
| Partner meetings | No (optional §15D) |
| Partner team management | No |
| Partner notification preferences | No |

**By my reading, none of the 10 blocked items is a §13 or §14 requirement.** That changes how they should be reported: they are not "gaps against the PRD", they are unrequired placeholders. The genuine PRD gaps are listed in `STAGE1_01` (P-04, P-16, P-18, A-10, A-19).

## 5. §23 "out of scope unless separately approved" – checklist

| Item | Present in code? |
|---|---|
| Payment processing | No (RUN grep) |
| Contract e-signature | No |
| Live project marketplace | No (Projects page is a disclaimer only) |
| Automated partner scoring that makes final decisions | No. Eligibility values are entered by a reviewer; no auto-approve/reject code found |
| Public disclosure of partner documents | Not applicable to the console; documents are fetched through authorised download endpoints |
| Full ERP / CRM replacement | No |
| Regulated healthcare / financial processing | No |
| Guaranteed project allocation | No (explicit disclaimer on the Projects page) |
