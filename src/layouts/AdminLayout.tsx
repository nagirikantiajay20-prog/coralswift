import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Breadcrumbs, useCrumbs } from './components/Breadcrumbs'
import { NotificationPanel } from './components/NotificationPanel'
import { Sidebar } from './components/Sidebar'
import { UserMenu } from './components/UserMenu'

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const title = useCrumbs().at(-1)?.label ?? 'Dashboard'

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3"
      >
        Skip to content
      </a>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden border-r border-line lg:block',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </aside>

      {/* Mobile/tablet sidebar as a left drawer */}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent title="Navigation" side="left">
          <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </DialogContent>
      </Dialog>

      <div className={cn(collapsed ? 'lg:pl-16' : 'lg:pl-64')}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white px-4">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle navigation"
            onClick={() => {
              if (window.matchMedia('(min-width: 1024px)').matches) setCollapsed((c) => !c)
              else setMobileOpen(true)
            }}
          >
            <Menu className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-sm font-semibold">{title}</p>
            <div className="hidden sm:block">
              <Breadcrumbs />
            </div>
          </div>
          <NotificationPanel />
          <UserMenu />
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
