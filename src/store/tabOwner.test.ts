import { afterEach, describe, expect, it, vi } from 'vitest'

/** Minimal same-origin BroadcastChannel: delivers to every OTHER instance, like the real one. */
class FakeBC {
  static all = new Set<FakeBC>()
  private l = new Set<(e: MessageEvent) => void>()
  readonly name: string
  constructor(name: string) {
    this.name = name
    FakeBC.all.add(this)
  }
  addEventListener(_t: string, f: (e: MessageEvent) => void) {
    this.l.add(f)
  }
  removeEventListener(_t: string, f: (e: MessageEvent) => void) {
    this.l.delete(f)
  }
  postMessage(data: unknown) {
    for (const o of FakeBC.all) if (o !== this) o.l.forEach((f) => f({ data } as MessageEvent))
  }
}

async function tab() {
  vi.resetModules()
  return import('./tabOwner')
}

describe('duplicate-tab detection', () => {
  afterEach(() => {
    FakeBC.all.clear()
    sessionStorage.clear()
    vi.unstubAllGlobals()
  })

  it('flags a copied session whose owner tab is still alive, but not a reload or closed owner', async () => {
    vi.stubGlobal('BroadcastChannel', FakeBC)
    const original = await tab()
    original.claimTab()
    const owner = sessionStorage.getItem('cs.tab')

    const copy = await tab() // duplicated tab: same sessionStorage, new in-memory id, original still open
    expect(sessionStorage.getItem('cs.tab')).toBe(owner)
    expect(await copy.ownedByAnotherLiveTab()).toBe(true)

    // Original closes/reloads: it releases ownership, so the stored token is simply adopted.
    window.dispatchEvent(new Event('pagehide'))
    expect(await (await tab()).ownedByAnotherLiveTab()).toBe(false)
  })

  it('does not wait forever when the owner is gone (crashed tab)', async () => {
    vi.stubGlobal('BroadcastChannel', FakeBC)
    sessionStorage.setItem('cs.tab', 'dead-tab-id')
    expect(await (await tab()).ownedByAnotherLiveTab()).toBe(false)
  })

  it('fails open without BroadcastChannel (no way to detect, behaves as before)', async () => {
    vi.stubGlobal('BroadcastChannel', undefined)
    sessionStorage.setItem('cs.tab', 'someone')
    expect(await (await tab()).ownedByAnotherLiveTab()).toBe(false)
  })
})
