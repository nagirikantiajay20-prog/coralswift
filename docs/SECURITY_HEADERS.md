# Security headers and CSP

## Hosting platform: not determined

The repository now has a `render.yaml` Blueprint (Render static site) carrying these headers; no `netlify.toml`, `vercel.json` or CI workflow exists. `public/_redirects` is Netlify / Cloudflare Pages syntax, and the README says Render Static Sites need a manual rewrite instead. **No host config file has been added to the repo.** Pick the block below that matches the real host, replace `API_ORIGIN` with the exact backend origin (currently `https://coralswift-backend.onrender.com`), and deploy it to staging first.

## Recommended policy

```
Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' API_ORIGIN; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests
Strict-Transport-Security: max-age=63072000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
X-Frame-Options: DENY
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cross-Origin-Opener-Policy: same-origin
```

Why each choice (all derived from what the built bundle actually does):

| Directive | Reason |
|---|---|
| `script-src 'self'` | Vite emits only external module scripts; there are no inline scripts, `eval` or `dangerouslySetInnerHTML` in `src/`. This is the directive that limits XSS. |
| `style-src ... 'unsafe-inline'` | `sonner` injects a `<style>` element at runtime and charts use style attributes. Without it toasts lose their styling. This weakens style injection protection only, not script execution. A nonce is not possible on a static host. |
| `font-src 'self' data:` | Vite inlines the smallest `@fontsource` woff2 file as a `data:` URI. **Measured:** with `font-src 'self'` the browser blocked it. |
| `img-src ... blob:` | Document previews and downloads use `URL.createObjectURL`. |
| `connect-src 'self' API_ORIGIN` | The only cross-origin calls go to `VITE_API_BASE_URL`. No analytics or third-party origins exist. |
| `frame-ancestors 'none'` + `X-Frame-Options: DENY` | The app is never embedded. `frame-ancestors` is ignored in a `<meta>` CSP, so these must be real headers. |
| `Referrer-Policy: no-referrer` | Reset and invitation links carry a one-time token in the query string; this stops it leaking in a `Referer` header. |
| HSTS | Send it only on the HTTPS response. Add `preload` only after deciding to commit the domain to the preload list. |

Also set `Cache-Control: no-cache` on `index.html` and long-lived immutable caching on `/assets/*` (hashed file names).

## Host snippets

**Netlify / Cloudflare Pages** (`public/_headers`, next to `_redirects`):

```
/*
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' API_ORIGIN; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests
  Strict-Transport-Security: max-age=63072000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Cross-Origin-Opener-Policy: same-origin
/index.html
  Cache-Control: no-cache
/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

**Render Static Site** (`render.yaml`):

```yaml
services:
  - type: web
    runtime: static
    name: coralswift-frontend
    buildCommand: npm ci && npm run build
    staticPublishPath: dist
    envVars:
      - key: VITE_API_BASE_URL
        value: https://coralswift-backend.onrender.com
    routes:
      - { type: rewrite, source: /*, destination: /index.html }
    headers:
      - { path: /*, name: Content-Security-Policy, value: "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://coralswift-backend.onrender.com; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests" }
      - { path: /*, name: Strict-Transport-Security, value: "max-age=63072000; includeSubDomains" }
      - { path: /*, name: X-Content-Type-Options, value: nosniff }
      - { path: /*, name: Referrer-Policy, value: no-referrer }
      - { path: /*, name: X-Frame-Options, value: DENY }
      - { path: /*, name: Permissions-Policy, value: "camera=(), microphone=(), geolocation=(), payment=()" }
```

Render serves HTTPS itself and adds HSTS on custom domains; keep the explicit header anyway.

## What was tested

A staging build (`vite build --mode staging`, API base pointed at a local mock that always answers 401) was served by a small Node server that attached the policy above (with `http://localhost:4010` as the API origin and without `upgrade-insecure-requests`, `HSTS` or `COOP`). In the in-app browser:

- `/login` and `/partner/login` rendered with fonts, styles and form controls.
- A bogus login produced the API's error message in the UI, so `connect-src` allowed the call and the error path works.
- The runtime `<style>` injection by `sonner` was present (one `<style>` element).
- No `securitypolicyviolation` events or CSP console errors after the fix.
- **One real violation was found and fixed:** the inlined `data:` font was blocked under `font-src 'self'`.

**Not tested:** authenticated pages (no credentials), real PDF/image preview from a `blob:` URL, CSV download, the production API origin (CORS from a non-allow-listed origin fails regardless of CSP), HSTS, `frame-ancestors` and `X-Frame-Options` (these were not exercised by an embedding page), `COOP`, and `Permissions-Policy`. Re-run the authenticated flows on staging with the real header set before production.

CSP is mitigation, not a fix: it reduces the chance of XSS but does not make a JavaScript-readable refresh token safe (see `AUTH_AND_INTEGRATION_NOTES.md`).
