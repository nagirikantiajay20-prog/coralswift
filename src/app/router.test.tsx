import { render, screen } from '@testing-library/react'
import { MemoryRouter, matchRoutes, Route, Routes } from 'react-router-dom'
import { NAVIGATION } from '@/config/navigation'
import { ModuleRoute, ProtectedRoute } from '@/features/auth/components/guards'
import { useAuthStore } from '@/store/authStore'
import { router } from './router'

const user = (role: 'super_administrator' | 'content_administrator') => ({
  id: '1',
  name: 'T',
  email: 't@example.com',
  role,
})

const isCatchAll = (path: string) =>
  matchRoutes(router.routes, path)?.some((m) => m.route.path === '*') ?? true

describe('router', () => {
  it('every sidebar item resolves to a real route (no dead links)', () => {
    for (const item of NAVIGATION.flatMap((g) => g.items)) {
      expect(isCatchAll(item.to), item.to).toBe(false)
    }
  })

  it('unknown paths fall through to the 404 route', () => {
    expect(isCatchAll('/admin/does-not-exist')).toBe(true)
    expect(isCatchAll('/nope')).toBe(true)
  })

  it('has no duplicate absolute leaf paths in navigation', () => {
    const paths = NAVIGATION.flatMap((g) => g.items.map((i) => i.to))
    expect(new Set(paths).size).toBe(paths.length)
  })
})

describe('route guards', () => {
  const app = (path: string) => (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/unauthorized" element={<p>access denied</p>} />
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route element={<ModuleRoute module="strategicEnquiries" />}>
            <Route path="strategic" element={<p>strategic secret</p>} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>
  )

  afterEach(() => useAuthStore.getState().clear())

  it('redirects unauthenticated users to login', () => {
    render(app('/admin/strategic'))
    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('denies strategic module to non-super roles', () => {
    useAuthStore.getState().setUser(user('content_administrator'))
    render(app('/admin/strategic'))
    expect(screen.getByText('access denied')).toBeInTheDocument()
    expect(screen.queryByText('strategic secret')).toBeNull()
  })

  it('allows strategic module for super administrator', () => {
    useAuthStore.getState().setUser(user('super_administrator'))
    render(app('/admin/strategic'))
    expect(screen.getByText('strategic secret')).toBeInTheDocument()
  })
})

describe('partner portal routes', () => {
  it('every partner nav item resolves to a real partner route', async () => {
    const { PARTNER_NAVIGATION } = await import('@/partner/config/navigation')
    for (const item of PARTNER_NAVIGATION) {
      expect(item.to.startsWith('/partner/')).toBe(true)
      expect(isCatchAll(item.to), item.to).toBe(false)
    }
  })

  it('partner paths are absent from admin navigation and outside the admin guard', () => {
    expect(NAVIGATION.flatMap((g) => g.items).some((i) => i.to.startsWith('/partner'))).toBe(false)
    const m = matchRoutes(router.routes, '/partner/dashboard') ?? []
    expect(m.some((r) => r.route.path === '/admin')).toBe(false)
  })
})
