# Auth architecture, residual risk, and integration decisions

## Session model

- Access token: memory only (`useAuthStore.accessToken`).
- Refresh token: the backend returns it in the JSON body (no HttpOnly cookie), so it is mirrored to `sessionStorage` (`cs.rt`) to survive reload. It is one-time-use: `POST /auth/refresh` rotates it and **reuse revokes the session** (per the OpenAPI description).
- Not persisted while MFA is pending, so a reload cannot skip the second factor (`authStore.setTokens`).
- Refresh is single-flight in `client.ts` (concurrent 401s share one refresh, tested) and in `authService.restore()` (StrictMode double mount, tested).
- Logout calls `POST /auth/logout` (revokes the server session) and always clears local state.

## Changes in this round

| Risk | Change |
|---|---|
| **Transient failure expired the session.** A network error or 5xx during refresh signed the user out. | `refresh()` now treats only a server answer below 500 (excluding 429) as "session over". Offline, timeout, 5xx and 429 reject instead; the interceptor keeps the session and surfaces the original error. `restore()` keeps the stored token on those failures so the next load can retry. Tested. |
| **Duplicated tab.** Duplicating a tab copies `sessionStorage`; if both tabs refresh, the second presents a used token and the backend revokes the whole session. | `src/store/tabOwner.ts`: the tab that stored the token owns it. On startup a tab whose stored owner id is still alive on a same-origin `BroadcastChannel` does not use the token and starts signed out. Ownership is released on `pagehide`, so reload and close are unaffected. Fails open (old behaviour) when `BroadcastChannel` is missing. Tested with a fake channel. |

### Why cross-tab *refresh sharing* was not built

Letting tabs share one session would mean moving the refresh token into `localStorage`, or broadcasting tokens between tabs. Both put the token where every tab, extension and injected script on the origin can read it, and a leader election would still race with rotation. That violates the rotation rules and widens exposure, so it was **rejected**. The implemented design shares only a random presence id, never a token. The cost: a duplicated tab starts signed out instead of silently sharing the session.

## Residual risks (not fixed, do not describe as production-grade)

1. **XSS can read the refresh token.** It is in `sessionStorage`; the backend gives no HttpOnly cookie, so the app cannot provide HttpOnly protection. The CSP in `SECURITY_HEADERS.md` reduces XSS likelihood but does not remove this. The real fix is backend-side: a `Secure; HttpOnly; SameSite` cookie for refresh, plus a short refresh lifetime. Staff can read the configured lifetime on the Security settings page (`refresh_token_minutes`).
2. **Interrupted refresh.** If the connection drops after the server rotated the token but before the response arrives, or the page is reloaded mid-refresh, the stored token is already spent. The next attempt is a reuse and revokes the session, forcing a re-login. No client-side fix exists without server support (e.g. a short reuse grace window).
3. **Orphaned tabs.** A discarded or frozen original tab cannot answer the duplicate check, so a copy can adopt a token the original later tries to reuse.
4. **Token-bearing URLs.** Reset and invitation links carry tokens in the query string; `Referrer-Policy: no-referrer` is required at the host.
5. **Console logging.** `ErrorBoundary` logs the thrown error. It would include request config (and so a refresh body) only if an axios error were thrown during render, which does not happen today.

## Integration decisions for previously unused endpoints

| Endpoint | Decision |
|---|---|
| `PATCH /partner/applications/{id}` | **Integrated.** Draft-only editing of pathway and cover note on the Application page (`ApplicationActions`). Empty cover notes are omitted rather than sent as null, so a note cannot be cleared from the UI. |
| `GET /partner/applications/{id}/readiness` | **Integrated.** Shown for drafts; Submit stays disabled while the backend reports missing profile fields or document categories. |
| `POST .../submit`, `.../resubmit`, `.../withdraw` | **Integrated.** Submit: draft only. Resubmit: `information_requested` with no open requests. Withdraw: pre-decision statuses, with a confirmation dialog and optional note (max 4,000). The backend still enforces state rules; its 409/422 messages are shown. |
| `GET /partner/applications/{id}` | **Not integrated.** The list endpoint returns the same `ApplicationOut` and is already cached. Add only if a deep-link page needs a single fetch. |
| `GET /reviewer/transitions` | **Integrated** in the staff stage-change dialog: `needs_reason` and `needs_assigned_reviewer` are enforced on top of the built-in decision rule. `dedicated_endpoint` is **not** used to hide options, because which generic transitions the backend refuses is unverified. If the call fails, the built-in rules apply. |
| `GET /auth/permissions` | **Not integrated.** Menu and route gating come from `ROLE_MODULES` in `src/config/permissions.ts`, and the backend authorizes every request regardless. A comparison against this endpoint is a useful staging check for drift but needs a staff account; no user-facing feature justifies it. |
| `POST /auth/mfa/disable` (staff) | **Not integrated, by design.** The spec says partner accounts only. Staff MFA reset is an administrator action (`POST /admin/users/{id}/mfa-reset`), which is integrated. |
| `GET /admin/audit/{id}`, `GET /admin/accounts/{id}`, `GET /admin/documents/{id}/history`, `GET /partner/document-requests/{id}` | **Not integrated.** List endpoints already return what the UI shows, except `accounts/{id}`'s `recent_activity` and the admin document review history, which are candidates for a future detail panel. |

## Notification contract

`PartnerNotificationOut.category` and `related_reference` are free strings with no documented values; the admin feed's `kind` and `record_type` are also undocumented. Consequently:

- Partner notifications: **no category is mapped to a destination** (`CATEGORY_ROUTES` ships empty). `related_reference` renders as text. Unknown categories can never produce a link.
- Admin feed: only `record_type` values `portal_application` and `enquiry` are linked. Those two are inferred from earlier live behaviour, not documented in the spec. Links go only to routes the signed-in role can open (applications or application-reviews; strategic enquiries use the strategic module), and ids are URL-encoded.

Backend input needed: the enumerated `category`, `kind` and `record_type` values, and whether `related_reference` is a human reference or an id.
