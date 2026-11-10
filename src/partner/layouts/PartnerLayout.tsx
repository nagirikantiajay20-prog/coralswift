import { Bell, LogOut, Menu, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { authService } from '@/features/auth/services/authService'
import { useAuthStore } from '@/store/authStore'
import logo from '@/assets/coralswift-logo.png'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { PARTNER_NAVIGATION } from '../config/navigation'
import { PARTNER_ROUTES } from '../config/routes'

const link = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition-colors',
    isActive
      ? 'border-coral-bright bg-warm font-medium'
      : 'border-transparent text-navy-soft hover:bg-surface',
  )

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Partner navigation" className="p-3">
      <ul className="space-y-1">
        {PARTNER_NAVIGATION.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink to={to} end onClick={onNavigate} className={link}>
              <Icon className="size-4 shrink-0" aria-hidden /> {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * Partner Portal shell. Deliberately NOT wrapped in the admin ProtectedRoute: the shared auth store
 * guards staff sessions; partner pages are guarded by PartnerRoute (see routes.tsx).
 */
export function PartnerLayout() {
  const [open, setOpen] = useState(false)
  const partner = useAuthStore((s) => s.partner)
  const navigate = useNavigate()
  const logout = async () => {
    await authService.signOut() // revokes the server session; local state cleared regardless
    navigate(PARTNER_ROUTES.login, { replace: true })
  }
  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-white lg:block">
        <div className="flex h-16 items-center border-b border-line px-4">
          <img src={logo} alt="CoralSwift Technologies" className="h-10 w-auto" />
        </div>
        <Nav />
      </aside>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Navigation" side="left">
          <Nav onNavigate={() => setOpen(false)} />
        </DialogContent>
      </Dialog>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <p className="min-w-0 flex-1 truncate font-heading text-sm font-semibold">
            Partner Portal
            {partner && (
              <span className="font-normal text-muted"> · {partner.organizationName}</span>
            )}
          </p>
          <Button variant="ghost" size="icon" aria-label="Notifications" asChild>
            <Link to={PARTNER_ROUTES.notifications}>
              <Bell className="size-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" aria-label="Account" asChild>
            <Link to={PARTNER_ROUTES.account}>
              <UserRound className="size-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" aria-label="Log out" onClick={logout}>
            <LogOut className="size-5" />
          </Button>
        </header>
        <main id="main" className="p-4 sm:p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
