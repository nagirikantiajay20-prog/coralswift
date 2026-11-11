/**
 * Duplicate-tab detection. Tab duplication copies sessionStorage, so two live tabs could hold the
 * same ONE-TIME refresh token, and the backend revokes the session when a rotated token is reused.
 * Nothing secret is shared: tabs only exchange a random presence id over a same-origin
 * BroadcastChannel. The tab that stored the token "owns" it; a copy that finds its owner still
 * alive must not use the token (it starts signed out instead).
 */
const KEY = 'cs.tab'
const WAIT_MS = 150
export const tabId = globalThis.crypto?.randomUUID?.() ?? String(Math.random())

let ch: BroadcastChannel | null = null
try {
  ch = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('cs.session')
} catch {
  ch = null
}
ch?.addEventListener('message', (e: MessageEvent) => {
  if (e.data?.type === 'who' && e.data.owner === tabId) ch?.postMessage({ type: 'me', owner: tabId })
})

const session = {
  get: () => {
    try {
      return sessionStorage.getItem(KEY)
    } catch {
      return null
    }
  },
  set: (v: string | null) => {
    try {
      if (v) sessionStorage.setItem(KEY, v)
      else sessionStorage.removeItem(KEY)
    } catch {
      /* storage blocked: no persistence, so nothing to protect */
    }
  },
}

export const claimTab = () => session.set(tabId)
export const releaseTab = () => session.get() === tabId && session.set(null)

if (typeof window !== 'undefined') {
  // A reload or close releases ownership immediately; bfcache restore claims it back.
  window.addEventListener('pagehide', (e) => {
    if (!e.persisted) releaseTab()
  })
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && session.get() === null) claimTab()
  })
}

/** True when the stored token belongs to a different tab that is still open. */
export function ownedByAnotherLiveTab(): Promise<boolean> {
  const owner = session.get()
  const bus = ch
  if (!owner || owner === tabId || !bus) return Promise.resolve(false)
  return new Promise((resolve) => {
    const on = (e: MessageEvent) => {
      if (e.data?.type === 'me' && e.data.owner === owner) done(true)
    }
    const done = (v: boolean) => {
      clearTimeout(timer)
      bus.removeEventListener('message', on)
      resolve(v)
    }
    const timer = setTimeout(() => done(false), WAIT_MS)
    bus.addEventListener('message', on)
    bus.postMessage({ type: 'who', owner })
  })
}
