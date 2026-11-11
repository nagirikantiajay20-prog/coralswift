// Usage (PowerShell): $env:CS_EMAIL='...'; $env:CS_PASSWORD='...'; node scripts/probe-live.mjs
// Prints response SHAPES only (keys/types), never tokens or values. Paste the output back.
const B = 'https://coralswift-backend.onrender.com/api/v1'
const shape = (v, d = 0) =>
  Array.isArray(v)
    ? `[${v.length ? shape(v[0], d + 1) : ''}]`
    : v && typeof v === 'object'
      ? d > 2
        ? '{…}'
        : `{${Object.entries(v).map(([k, x]) => `${k}:${shape(x, d + 1)}`).join(', ')}}`
      : v === null
        ? 'null'
        : typeof v
const j = async (path, opt = {}) => {
  const r = await fetch(B + path, opt)
  return { s: r.status, b: await r.json().catch(() => null) }
}
const l = await j('/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: process.env.CS_EMAIL, password: process.env.CS_PASSWORD }),
})
console.log('login', l.s, shape(l.b?.data && { ...l.b.data, access_token: '', refresh_token: '' }))
const h = { authorization: `Bearer ${l.b?.data?.access_token}` }
for (const p of ['/auth/me', '/auth/permissions', '/reviewer/transitions', '/admin/assignees?purpose=applications',
  '/reviewer/applications?page_size=2', '/admin/follow-ups?page_size=2', '/admin/documents?page_size=2',
  '/admin/security-policy', '/admin/enquiries?page_size=2']) {
  const r = await j(p, { headers: h })
  console.log(p, r.s, shape(r.b?.data), 'meta:', shape(r.b?.meta))
}
